import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  AdminMetrics,
  AdminOrder,
  AdminProduct,
  AdminProductImage,
  AdminUser,
  ProductEditorValues,
} from "@/types/admin";

const adminKeys = {
  all: ["admin"] as const,
  products: ["admin", "products"] as const,
  product: (id: string) => ["admin", "products", id] as const,
  metrics: ["admin", "metrics"] as const,
  users: (page: number) => ["admin", "users", page] as const,
  orders: ["admin", "orders"] as const,
};

function requireSupabase() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("products")
    .select("*, product_images(*), product_variants(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as AdminProduct[];
}

async function fetchAdminProduct(id: string): Promise<AdminProduct> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("products")
    .select("*, product_images(*), product_variants(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as AdminProduct;
}

async function saveAdminProduct(values: ProductEditorValues): Promise<string> {
  const client = requireSupabase();
  const payload = {
    name: values.name.trim(),
    slug: values.slug.trim(),
    description: values.description.trim() || null,
    price_cents: values.priceCents,
    category: values.category,
    material: values.material.trim() || null,
    tag: values.tag.trim() || null,
    tag_color: values.tagColor.trim() || null,
    weight_grams: values.weightGrams,
    width_cm: values.widthCm,
    height_cm: values.heightCm,
    length_cm: values.lengthCm,
    is_active: values.isActive,
    updated_at: new Date().toISOString(),
  };

  let productId = values.id;
  if (productId) {
    const { error } = await client.from("products").update(payload).eq("id", productId);
    if (error) throw error;
  } else {
    const { data, error } = await client.from("products").insert(payload).select("id").single();
    if (error) throw error;
    productId = data.id;
  }

  const keptVariantIds = values.variants.flatMap((variant) => (variant.id ? [variant.id] : []));
  const existing = await client.from("product_variants").select("id").eq("product_id", productId);
  if (existing.error) throw existing.error;

  const removedIds = (existing.data ?? [])
    .map((variant) => variant.id)
    .filter((id) => !keptVariantIds.includes(id));
  if (removedIds.length) {
    const { error } = await client.from("product_variants").delete().in("id", removedIds);
    if (error) throw error;
  }

  for (const variant of values.variants) {
    const variantPayload = {
      product_id: productId,
      size: variant.size.trim(),
      color_name: variant.colorName.trim() || null,
      color_hex: variant.colorHex.trim() || null,
      stock_quantity: variant.stockQuantity,
      updated_at: new Date().toISOString(),
    };

    const result = variant.id
      ? await client.from("product_variants").update(variantPayload).eq("id", variant.id)
      : await client.from("product_variants").insert(variantPayload);
    if (result.error) throw result.error;
  }

  return productId;
}

async function setProductActive({ id, isActive }: { id: string; isActive: boolean }) {
  const client = requireSupabase();
  const { error } = await client
    .from("products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function deleteProduct(id: string) {
  const client = requireSupabase();
  const product = await fetchAdminProduct(id);
  const paths = product.product_images.map((image) => image.path);

  const { error } = await client.from("products").delete().eq("id", id);
  if (error) throw error;
  if (paths.length) {
    const storageResult = await client.storage.from("products").remove(paths);
    if (storageResult.error) throw storageResult.error;
  }
}

function validateImage(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) throw new Error("Use uma imagem JPEG, PNG, WebP ou GIF.");
  if (file.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 5 MB.");
}

async function uploadProductImage({
  productId,
  file,
  sortOrder,
}: {
  productId: string;
  file: File;
  sortOrder: number;
}): Promise<AdminProductImage> {
  validateImage(file);
  const client = requireSupabase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${productId}/${crypto.randomUUID()}-${safeName}`;
  const upload = await client.storage.from("products").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const inserted = await client
    .from("product_images")
    .insert({ product_id: productId, path, sort_order: sortOrder })
    .select("*")
    .single();

  if (inserted.error) {
    await client.storage.from("products").remove([path]);
    throw inserted.error;
  }
  return inserted.data as unknown as AdminProductImage;
}

async function removeProductImage(image: AdminProductImage) {
  const client = requireSupabase();
  const backup = await client.storage.from("products").download(image.path);
  if (backup.error) throw backup.error;

  const storageResult = await client.storage.from("products").remove([image.path]);
  if (storageResult.error) throw storageResult.error;

  const { error } = await client.from("product_images").delete().eq("id", image.id);
  if (error) {
    await client.storage.from("products").upload(image.path, backup.data, {
      contentType: backup.data.type,
      upsert: true,
    });
    throw error;
  }
}

async function replaceProductImage({ image, file }: { image: AdminProductImage; file: File }) {
  const replacement = await uploadProductImage({
    productId: image.product_id,
    file,
    sortOrder: image.sort_order,
  });

  try {
    await removeProductImage(image);
  } catch (error) {
    await removeProductImage(replacement);
    throw error;
  }
}

async function reorderProductImages(images: AdminProductImage[]) {
  const client = requireSupabase();
  for (const [sortOrder, image] of images.entries()) {
    const { error } = await client.from("product_images").update({ sort_order: sortOrder }).eq("id", image.id);
    if (error) throw error;
  }
}

function maskCpfForAdmin(cpf: string | null): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***.***.***-**";
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
}

async function fetchAdminProfilesFallback(
  page: number,
): Promise<{ users: AdminUser[]; total: number; limited: true }> {
  const client = requireSupabase();
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const { data, error, count } = await client
    .from("profiles")
    .select("id, full_name, phone, cpf, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;

  return {
    users: (data ?? []).map((profile) => ({
      id: profile.id,
      email: null,
      fullName: profile.full_name,
      phone: profile.phone,
      cpf: maskCpfForAdmin(profile.cpf),
      provider: null,
      createdAt: profile.created_at,
    })),
    total: count ?? 0,
    limited: true,
  };
}

async function fetchAdminUsers(
  page: number,
): Promise<{ users: AdminUser[]; total: number; limited?: boolean }> {
  const client = requireSupabase();
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada.");

  const response = await fetch(`/api/admin/users?page=${page}&perPage=25`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return fetchAdminProfilesFallback(page);
  }

  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar os usuários.");
  return body;
}

async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("orders")
    .select(
      "*, order_items(id, quantity, price_cents_at_purchase, products(name), product_variants(size, color_name))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminOrder[];
}

async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const client = requireSupabase();
  const [products, users, variants, orders] = await Promise.all([
    client.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    client.from("profiles").select("*", { count: "exact", head: true }),
    client.from("product_variants").select("stock_quantity"),
    client.from("orders").select("status, total_cents"),
  ]);

  const firstError = products.error ?? users.error ?? variants.error ?? orders.error;
  if (firstError) throw firstError;

  const stocks = variants.data ?? [];
  const orderRows = (orders.data ?? []) as { status: AdminOrder["status"]; total_cents: number }[];
  const ordersByStatus: AdminMetrics["ordersByStatus"] = {};
  for (const order of orderRows) {
    ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1;
  }

  return {
    activeProducts: products.count ?? 0,
    users: users.count ?? 0,
    outOfStockVariants: stocks.filter((variant) => variant.stock_quantity === 0).length,
    lowStockVariants: stocks.filter((variant) => variant.stock_quantity > 0 && variant.stock_quantity <= 5).length,
    confirmedRevenueCents: orderRows
      .filter((order) => ["paid", "processing", "shipped", "delivered"].includes(order.status))
      .reduce((total, order) => total + order.total_cents, 0),
    ordersByStatus,
  };
}

export function useAdminProducts() {
  return useQuery({ queryKey: adminKeys.products, queryFn: fetchAdminProducts });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.product(id ?? ""),
    queryFn: () => fetchAdminProduct(id as string),
    enabled: Boolean(id),
  });
}

export function useSaveAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAdminProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.products }),
  });
}

export function useSetProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setProductActive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.products }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.products }),
  });
}

export function useProductImages(productId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.product(productId) });
    queryClient.invalidateQueries({ queryKey: adminKeys.products });
  };

  return {
    upload: useMutation({ mutationFn: uploadProductImage, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: removeProductImage, onSuccess: invalidate }),
    replace: useMutation({ mutationFn: replaceProductImage, onSuccess: invalidate }),
    reorder: useMutation({ mutationFn: reorderProductImages, onSuccess: invalidate }),
  };
}

export function useAdminUsers(page: number) {
  return useQuery({ queryKey: adminKeys.users(page), queryFn: () => fetchAdminUsers(page) });
}

export function useAdminOrders() {
  return useQuery({ queryKey: adminKeys.orders, queryFn: fetchAdminOrders });
}

export function useAdminMetrics() {
  return useQuery({ queryKey: adminKeys.metrics, queryFn: fetchAdminMetrics });
}
