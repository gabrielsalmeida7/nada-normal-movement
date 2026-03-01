import { CategoryPage } from "@/components/CategoryPage";
import { CATEGORY_CONFIG } from "@/config/categories";
import type { Product } from "@/types/product";
import productTshirt from "@/assets/product-tshirt.jpg";
import productSocks from "@/assets/product-socks.jpg";
import productJacket from "@/assets/product-jacket.jpg";
import productTank from "@/assets/product-tank.jpg";

const products: Product[] = [
  {
    id: 1,
    name: "Camiseta Caos",
    price: 189.90,
    image: productTshirt,
    tag: "Novo",
    tagColor: "bg-nn-lime",
    description: "Para quem acorda às 4h e chama isso de privilégio. Dry-fit leve com costuras seladas para máxima performance.",
    material: "92% Poliéster Dry-fit, 8% Elastano | Costuras seladas",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto Obsessão", hex: "#0d0d0d" },
      { name: "Laranja Caos", hex: "#ff6b1a" },
      { name: "Branco Ruído", hex: "#f0f0f0" },
    ],
  },
  {
    id: 2,
    name: "Regata Performance",
    price: 149.90,
    image: productTank,
    tag: "Limitado",
    tagColor: "bg-nn-red",
    description: "Ultra leve, ventilação máxima. Para quem quer sentir o vento e deixar o suor falar.",
    material: "100% Poliéster Micro | Ventilação mesh lateral",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto Abissal", hex: "#0d0d0d" },
      { name: "Verde Neon", hex: "#39ff14" },
    ],
  },
  {
    id: 3,
    name: "Meia Compressão NN",
    price: 89.90,
    image: productSocks,
    tag: "Bestseller",
    tagColor: "bg-nn-orange",
    description: "Compressão graduada, anti-bolhas. Cada passo é um manifesto contra a mediocridade.",
    material: "78% Poliamida, 22% Elastano | Compressão graduada",
    sizes: ["35-37", "38-40", "41-43", "44-46"],
    colors: [
      { name: "Preto Total", hex: "#0d0d0d" },
      { name: "Laranja Fogo", hex: "#ff6b1a" },
      { name: "Roxo Neon", hex: "#a855f7" },
    ],
  },
  {
    id: 4,
    name: "Short Obsessão",
    price: 159.90,
    image: productTshirt,
    tag: null,
    tagColor: null,
    description: "Bolso para celular, tecido stretch. Liberdade de movimento para quem não aceita limites.",
    material: "88% Poliéster, 12% Elastano | Bolso lateral com zíper",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto Noite", hex: "#0d0d0d" },
      { name: "Cinza Asfalto", hex: "#4a4a4a" },
    ],
  },
  {
    id: 5,
    name: "Jaqueta Corta-Vento",
    price: 349.90,
    image: productJacket,
    tag: "Novo",
    tagColor: "bg-nn-lime",
    description: "Impermeável, refletiva. Corra na chuva, no frio, no escuro — nada te para.",
    material: "100% Nylon Ripstop | Impermeável, detalhes refletivos",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto Stealth", hex: "#0d0d0d" },
      { name: "Laranja Alerta", hex: "#ff6b1a" },
    ],
  },
  {
    id: 6,
    name: "Boné UV Shield",
    price: 79.90,
    image: productTank,
    tag: null,
    tagColor: null,
    description: "Proteção UV50+, tecido respirável. Blindagem solar para quem corre sob qualquer sol.",
    material: "100% Poliéster UV50+ | Tira de suor interna",
    sizes: ["Único"],
    colors: [
      { name: "Preto", hex: "#0d0d0d" },
      { name: "Branco", hex: "#f0f0f0" },
      { name: "Laranja", hex: "#ff6b1a" },
    ],
  },
];

const CategoryRunning = () => (
  <CategoryPage config={CATEGORY_CONFIG.running} products={products} />
);

export default CategoryRunning;
