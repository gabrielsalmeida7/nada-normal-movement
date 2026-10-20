import { ArrowDown, ArrowUp, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getProductImageUrl } from "@/lib/products";
import { useProductImages } from "@/hooks/admin/use-admin-data";
import type { AdminProductImage } from "@/types/admin";

interface ProductImageManagerProps {
  productId: string;
  images: AdminProductImage[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

export function ProductImageManager({ productId, images }: ProductImageManagerProps) {
  const actions = useProductImages(productId);
  const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const busy =
    actions.upload.isPending ||
    actions.remove.isPending ||
    actions.replace.isPending ||
    actions.reorder.isPending;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      await actions.upload.mutateAsync({ productId, file, sortOrder: sortedImages.length });
      toast.success("Imagem adicionada.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const replace = async (image: AdminProductImage, file: File | undefined) => {
    if (!file) return;
    try {
      await actions.replace.mutateAsync({ image, file });
      toast.success("Imagem substituída.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async (image: AdminProductImage) => {
    if (!window.confirm("Excluir esta imagem permanentemente?")) return;
    try {
      await actions.remove.mutateAsync(image);
      toast.success("Imagem excluída.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sortedImages.length) return;
    const next = [...sortedImages];
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await actions.reorder.mutateAsync(next);
      toast.success(target === 0 ? "Nova imagem de capa definida." : "Ordem atualizada.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <section className="space-y-4 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Imagens</h2>
          <p className="text-sm text-muted-foreground">A primeira imagem é usada como capa.</p>
        </div>
        <label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <span className="inline-flex h-10 cursor-pointer items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <ImagePlus className="mr-2 h-4 w-4" />
            Adicionar foto
          </span>
        </label>
      </div>

      {sortedImages.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma imagem cadastrada.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedImages.map((image, index) => (
            <article key={image.id} className="overflow-hidden rounded-md border bg-background">
              <div className="aspect-square bg-muted">
                <img
                  src={getProductImageUrl(image.path)}
                  alt={`Imagem ${index + 1} do produto`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1 p-2">
                {index === 0 && <span className="mr-auto text-xs font-semibold text-nn-pink">CAPA</span>}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={busy || index === 0}
                  aria-label="Mover imagem para cima"
                  onClick={() => void move(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={busy || index === sortedImages.length - 1}
                  aria-label="Mover imagem para baixo"
                  onClick={() => void move(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md hover:bg-accent">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => {
                      void replace(image, event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Substituir imagem</span>
                </label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Excluir imagem"
                  onClick={() => void remove(image)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
