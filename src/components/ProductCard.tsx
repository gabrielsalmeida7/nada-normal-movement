import { motion } from "framer-motion";
import { ShoppingBag, Heart, Eye } from "lucide-react";

const organicCardStyles = [
  { borderRadius: '10px 40px 10px 40px' },
  { borderRadius: '40px 10px 40px 10px' },
  { borderRadius: '5px 30px 50px 15px' },
  { borderRadius: '50px 15px 5px 35px' },
  { borderRadius: '30px 10px 30px 10px' },
  { borderRadius: '15px 35px 15px 35px' },
];

const blobClasses = ['shape-blob-1', 'shape-blob-2', 'shape-blob-3', 'shape-blob-4'];

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  tag?: string | null;
  tagColor?: string | null;
  description: string;
  material: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
}

interface ProductCardProps {
  product: Product;
  index: number;
  accentColor: string;
  shadowClass: string;
}

export const ProductCard = ({ product, index, accentColor, shadowClass }: ProductCardProps) => {
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
        className={`relative overflow-hidden bg-card border-4 border-border group-hover:border-${accentColor} transition-all duration-300 group-hover:${shadowClass}`}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Tag */}
        {product.tag && (
          <span
            className={`absolute top-4 left-4 ${product.tagColor} text-nn-black font-display text-xs px-3 py-1 tracking-wider tag-organic`}
          >
            {product.tag}
          </span>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`w-12 h-12 bg-nn-pink text-nn-black flex items-center justify-center ${blobClasses[0]}`}
          >
            <ShoppingBag size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`w-12 h-12 bg-foreground text-background flex items-center justify-center ${blobClasses[1]}`}
          >
            <Heart size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`w-12 h-12 bg-nn-purple-neon text-nn-black flex items-center justify-center ${blobClasses[2]}`}
          >
            <Eye size={20} />
          </motion.button>
        </div>
      </div>

      {/* Product Info */}
      <div className="mt-4 space-y-2">
        <h3 className={`font-display text-xl text-foreground group-hover:text-${accentColor} transition-colors`}>
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {product.description}
        </p>
        <p className="text-muted-foreground/70 text-xs italic">
          {product.material}
        </p>

        {/* Sizes */}
        <div className="flex gap-1.5 flex-wrap">
          {product.sizes.map((size) => (
            <span
              key={size}
              className="text-xs font-display px-2 py-1 border border-border text-muted-foreground hover:border-nn-pink hover:text-nn-pink transition-colors cursor-pointer"
              style={{ borderRadius: '8px 3px 8px 3px' }}
            >
              {size}
            </span>
          ))}
        </div>

        {/* Colors */}
        <div className="flex gap-2 items-center">
          {product.colors.map((color) => (
            <button
              key={color.name}
              title={color.name}
              className="w-5 h-5 border-2 border-border hover:border-foreground transition-colors cursor-pointer"
              style={{ backgroundColor: color.hex, borderRadius: '50% 40% 50% 40%' }}
            />
          ))}
        </div>

        {/* Price */}
        <p className={`text-${accentColor} font-bold text-lg font-display`}>
          R$ {product.price.toFixed(2).replace('.', ',')}
        </p>
      </div>
    </motion.div>
  );
};
