import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminProduct,
  useDeleteProduct,
  useSaveAdminProduct,
} from "@/hooks/admin/use-admin-data";
import {
  productEditorSchema,
  priceReaisToCents,
  slugifyProductName,
  type ProductEditorFormData,
} from "@/lib/admin-validation";
import type { AdminProduct, ProductEditorValues } from "@/types/admin";

const emptyValues: ProductEditorFormData = {
  name: "",
  slug: "",
  description: "",
  priceReais: "0,00",
  category: "street",
  material: "",
  tag: "",
  tagColor: "",
  weightGrams: null,
  widthCm: null,
  heightCm: null,
  lengthCm: null,
  isActive: true,
  variants: [{ size: "Único", colorName: "", colorHex: "", stockQuantity: 0 }],
};

function valuesFromProduct(product: AdminProduct): ProductEditorFormData {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    priceReais: (product.price_cents / 100).toFixed(2).replace(".", ","),
    category: product.category,
    material: product.material ?? "",
    tag: product.tag ?? "",
    tagColor: product.tag_color ?? "",
    weightGrams: product.weight_grams,
    widthCm: product.width_cm,
    heightCm: product.height_cm,
    lengthCm: product.length_cm,
    isActive: product.is_active,
    variants: product.product_variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      colorName: variant.color_name ?? "",
      colorHex: variant.color_hex ?? "",
      stockQuantity: variant.stock_quantity,
    })),
  };
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && error.code === "23503") {
    return "Este produto possui pedidos vinculados. Desative-o em vez de excluir.";
  }
  return error instanceof Error ? error.message : "Não foi possível salvar o produto.";
}

export default function AdminProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const productQuery = useAdminProduct(id);
  const saveMutation = useSaveAdminProduct();
  const deleteMutation = useDeleteProduct();
  const form = useForm<ProductEditorFormData>({
    resolver: zodResolver(productEditorSchema),
    defaultValues: emptyValues,
  });
  const variants = useFieldArray({ control: form.control, name: "variants" });

  useEffect(() => {
    if (productQuery.data) form.reset(valuesFromProduct(productQuery.data));
  }, [form, productQuery.data]);

  const onSubmit = async (data: ProductEditorFormData) => {
    try {
      const values: ProductEditorValues = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        priceCents: priceReaisToCents(data.priceReais),
        category: data.category,
        material: data.material,
        tag: data.tag,
        tagColor: data.tagColor,
        weightGrams: data.weightGrams,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        lengthCm: data.lengthCm,
        isActive: data.isActive,
        variants: data.variants.map((variant) => ({
          id: variant.id,
          size: variant.size,
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          stockQuantity: variant.stockQuantity,
        })),
      };
      const productId = await saveMutation.mutateAsync(values);
      toast.success(isNew ? "Produto criado." : "Produto atualizado.");
      if (isNew) navigate(`/admin/produtos/${productId}`, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const permanentlyDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm(
      "Excluir permanentemente este produto, variantes e imagens? Se houver pedidos vinculados, a exclusão será bloqueada.",
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Produto excluído.");
      navigate("/admin/produtos", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (!isNew && productQuery.isLoading) {
    return <p className="text-muted-foreground">Carregando produto…</p>;
  }
  if (!isNew && productQuery.error) {
    return <p className="text-destructive">Não foi possível carregar o produto.</p>;
  }

  const errors = form.formState.errors;

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline" asChild aria-label="Voltar para produtos">
            <Link to="/admin/produtos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="font-display text-3xl">{isNew ? "Novo produto" : "Editar produto"}</h2>
            <p className="text-sm text-muted-foreground">Dados comerciais, medidas e estoque.</p>
          </div>
        </div>
        {!isNew && (
          <Button variant="destructive" onClick={() => void permanentlyDelete()} disabled={deleteMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir permanentemente
          </Button>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <section className="grid gap-5 rounded-lg border bg-card p-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...form.register("name")}
              onBlur={(event) => {
                form.register("name").onBlur(event);
                if (!form.getValues("slug")) {
                  form.setValue("slug", slugifyProductName(event.target.value), { shouldValidate: true });
                }
              }}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input id="slug" {...form.register("slug")} />
            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceReais">Preço em reais (R$) *</Label>
            <Input
              id="priceReais"
              type="text"
              inputMode="decimal"
              placeholder="189,90"
              {...form.register("priceReais")}
            />
            {errors.priceReais && <p className="text-sm text-destructive">{errors.priceReais.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <select
              id="category"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              {...form.register("category")}
            >
              <option value="street">Street</option>
              <option value="running">Running</option>
              <option value="social">Social</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={5} {...form.register("description")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Input id="material" {...form.register("material")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">Tag</Label>
            <Input id="tag" placeholder="NOVO" {...form.register("tag")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagColor">Classe de cor da tag</Label>
            <Input id="tagColor" placeholder="bg-nn-lime" {...form.register("tagColor")} />
          </div>
          <label className="flex items-center gap-3 self-end rounded-md border p-3">
            <input type="checkbox" className="h-4 w-4" {...form.register("isActive")} />
            <span>
              <strong className="block text-sm">Produto ativo</strong>
              <span className="text-xs text-muted-foreground">Visível no catálogo público.</span>
            </span>
          </label>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 font-display text-xl">Peso e dimensões</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["weightGrams", "Peso (g)"],
              ["widthCm", "Largura (cm)"],
              ["heightCm", "Altura (cm)"],
              ["lengthCm", "Comprimento (cm)"],
            ].map(([name, label]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name}>{label}</Label>
                <Input
                  id={name}
                  type="number"
                  min="0"
                  step={name === "weightGrams" ? "1" : "0.01"}
                  {...form.register(name as "weightGrams", { valueAsNumber: true })}
                />
                {errors[name as "weightGrams"] && (
                  <p className="text-sm text-destructive">{errors[name as "weightGrams"]?.message}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl">Variantes e estoque</h3>
              <p className="text-sm text-muted-foreground">Cadastre cada combinação de tamanho e cor.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => variants.append({ size: "", colorName: "", colorHex: "", stockQuantity: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Variante
            </Button>
          </div>
          {errors.variants?.root?.message && (
            <p className="text-sm text-destructive">{errors.variants.root.message}</p>
          )}
          <div className="space-y-3">
            {variants.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <div>
                  <Label htmlFor={`variant-size-${index}`}>Tamanho *</Label>
                  <Input id={`variant-size-${index}`} {...form.register(`variants.${index}.size`)} />
                  {errors.variants?.[index]?.size && (
                    <p className="text-xs text-destructive">{errors.variants[index]?.size?.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`variant-color-${index}`}>Cor</Label>
                  <Input id={`variant-color-${index}`} {...form.register(`variants.${index}.colorName`)} />
                </div>
                <div>
                  <Label htmlFor={`variant-hex-${index}`}>Hexadecimal</Label>
                  <Input id={`variant-hex-${index}`} placeholder="#FFFFFF" {...form.register(`variants.${index}.colorHex`)} />
                  {errors.variants?.[index]?.colorHex && (
                    <p className="text-xs text-destructive">{errors.variants[index]?.colorHex?.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`variant-stock-${index}`}>Estoque *</Label>
                  <Input
                    id={`variant-stock-${index}`}
                    type="number"
                    min={0}
                    step={1}
                    {...form.register(`variants.${index}.stockQuantity`, { valueAsNumber: true })}
                  />
                  {errors.variants?.[index]?.stockQuantity && (
                    <p className="text-xs text-destructive">{errors.variants[index]?.stockQuantity?.message}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="self-end"
                  disabled={variants.fields.length === 1}
                  aria-label={`Remover variante ${index + 1}`}
                  onClick={() => variants.remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Salvando…" : "Salvar produto"}
          </Button>
        </div>
      </form>

      {id && productQuery.data && (
        <ProductImageManager productId={id} images={productQuery.data.product_images} />
      )}
    </section>
  );
}
