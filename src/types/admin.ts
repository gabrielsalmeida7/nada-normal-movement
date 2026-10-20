export type ProductCategory = "running" | "street" | "social";

export interface AdminProductImage {
  id: string;
  product_id: string;
  path: string;
  sort_order: number;
  created_at: string;
}

export interface AdminProductVariant {
  id: string;
  product_id: string;
  size: string;
  color_name: string | null;
  color_hex: string | null;
  stock_quantity: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  category: ProductCategory;
  material: string | null;
  tag: string | null;
  tag_color: string | null;
  weight_grams: number | null;
  width_cm: number | null;
  height_cm: number | null;
  length_cm: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_images: AdminProductImage[];
  product_variants: AdminProductVariant[];
}

export interface ProductEditorVariant {
  id?: string;
  size: string;
  colorName: string;
  colorHex: string;
  stockQuantity: number;
}

export interface ProductEditorValues {
  id?: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  category: ProductCategory;
  material: string;
  tag: string;
  tagColor: string;
  weightGrams: number | null;
  widthCm: number | null;
  heightCm: number | null;
  lengthCm: number | null;
  isActive: boolean;
  variants: ProductEditorVariant[];
}

export interface AdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  cpf: string | null;
  provider: string | null;
  createdAt: string;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface AdminOrderItem {
  id: string;
  quantity: number;
  price_cents_at_purchase: number;
  products: { name: string } | null;
  product_variants: { size: string; color_name: string | null } | null;
}

export interface AdminOrder {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  total_cents: number;
  shipping_cents: number;
  shipping_name: string | null;
  shipping_street: string;
  shipping_number: string;
  shipping_complement: string | null;
  shipping_neighborhood: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_zip_code: string;
  shipping_phone: string | null;
  created_at: string;
  order_items: AdminOrderItem[];
}

export interface AdminMetrics {
  activeProducts: number;
  users: number;
  outOfStockVariants: number;
  lowStockVariants: number;
  confirmedRevenueCents: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
}
