import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/product";
import { ComingSoonStamp } from "@/components/ComingSoonStamp";
import { useCartStore } from "@/stores/cart-store";

const organicCardStyles = [
  { borderRadius: '10px 40px 10px 40px' },
  { borderRadius: '40px 10px 40px 10px' },
  { borderRadius: '5px 30px 50px 15px' },
  { borderRadius: '50px 15px 5px 35px' },
  { borderRadius: '30px 10px 30px 10px' },
  { borderRadius: '15px 35px 15px 35px' },
];

const blobClasses = ['shape-blob-1', 'shape-blob-2', 'shape-blob-3', 'shape-blob-4'];

/** Mapa de classes Tailwind completas por accent (evita classes dinâmicas que o JIT não gera) */
const ACCENT_CLASSES: Record<string, { border: string; shadow: string; text: string; textHover: string }> = {
  'nn-orange': { border: 'group-hover:border-nn-orange', shadow: 'group-hover:shadow-neon-orange', text: 'text-nn-orange', textHover: 'group-hover:text-nn-orange' },
  'nn-lime': { border: 'group-hover:border-nn-lime', shadow: 'group-hover:shadow-neon-lime', text: 'text-nn-lime', textHover: 'group-hover:text-nn-lime' },
  'nn-yellow': { border: 'group-hover:border-nn-yellow', shadow: 'group-hover:shadow-neon-yellow', text: 'text-nn-yellow', textHover: 'group-hover:text-nn-yellow' },
  'nn-pink': { border: 'group-hover:border-nn-pink', shadow: 'group-hover:shadow-neon-pink', text: 'text-nn-pink', textHover: 'group-hover:text-nn-pink' },
  'nn-red': { border: 'group-hover:border-nn-red', shadow: 'group-hover:shadow-neon-pink', text: 'text-nn-red', textHover: 'group-hover:text-nn-red' },
};

interface ProductCardProps {
  product: Product;
  index: number;
  /** Chave do mapa (ex.: 'nn-orange', 'nn-lime') para border/shadow/text */
  accentKey?: keyof typeof ACCENT_CLASSES;
  availableForPurchase?: boolean;
}

const defaultAccent: keyof typeof ACCENT_CLASSES = 'nn-pink';

export const ProductCard = ({
  product,
  index,
  accentKey = defaultAccent,
  availableForPurchase = false,
}: ProductCardProps) => {
  const accent = ACCENT_CLASSES[accentKey] ?? ACCENT_CLASSES[defaultAccent];
  const addItem = useCartStore((state) => state.addItem);
  const availableVariants = product.variants?.filter((variant) => variant.stockQuantity > 0) ?? [];
  const selectedVariant = availableVariants[0] ?? null;
  const hasConfiguredVariants = Boolean(product.variants?.length);
  const canAddToCart =
    availableForPurchase && (!hasConfiguredVariants || selectedVariant !== null);

  const handleAddToCart = () => {
    if (!canAddToCart) return;

    addItem({
      productId: String(product.id),
      productVariantId: selectedVariant?.id ?? null,
      name: product.name,
      price: product.price,
      image: product.image,
      slug: product.slug,
      size: selectedVariant?.size ?? product.sizes?.[0] ?? "Único",
      colorName: selectedVariant?.colorName ?? product.colors?.[0]?.name ?? null,
      colorHex: selectedVariant?.colorHex ?? product.colors?.[0]?.hex ?? null,
    });
    toast.success(`${product.name} foi adicionado ao carrinho.`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="group"
    >
      {/* Image Container */}
      <div
        style={organicCardStyles[index % organicCardStyles.length]}
        className={`relative overflow-hidden bg-card border-4 border-border transition-all duration-300 ${accent.border} ${accent.shadow}`}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Tag */}
        {product.tag && (
          <span
            className={`absolute top-4 left-4 ${product.tagColor ?? ''} text-nn-black font-display text-xs px-3 py-1 tracking-wider tag-organic`}
          >
            {product.tag}
          </span>
        )}

        {!availableForPurchase && <ComingSoonStamp size="sm" />}
      </div>

      {/* Product Info */}
      <div className="mt-4 space-y-2">
        {product.category && (
          <span className={`${product.categoryColor ?? 'text-muted-foreground'} font-display text-xs tracking-widest`}>
            {product.category}
          </span>
        )}
        <h3 className={`font-display text-xl text-foreground transition-colors ${accent.textHover}`}>
          {product.name}
        </h3>
        {product.description != null && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {product.description}
          </p>
        )}
        {!availableForPurchase && product.colors && product.colors.length > 0 && (
          <div className="flex gap-2 items-center">
            {product.colors.map((color) => (
              <span
                key={color.name}
                title={color.name}
                className="w-5 h-5 border-2 border-border inline-block opacity-70"
                style={{ backgroundColor: color.hex, borderRadius: '50% 40% 50% 40%' }}
              />
            ))}
          </div>
        )}

        {/* Price */}
        <p className={`font-bold text-lg font-display ${accent.text}`}>
          R$ {product.price.toFixed(2).replace('.', ',')}
        </p>

        {availableForPurchase && (
          <Button
            type="button"
            className="w-full rounded-[30px_8px_30px_8px] border-2 border-nn-orange bg-transparent font-display tracking-wider text-nn-orange hover:scale-100 hover:bg-nn-orange hover:text-nn-black hover:shadow-none"
            disabled={!canAddToCart}
            onClick={handleAddToCart}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            {canAddToCart ? "Adicionar ao carrinho" : "Produto esgotado"}
          </Button>
        )}
      </div>
    </motion.div>
  );
};
