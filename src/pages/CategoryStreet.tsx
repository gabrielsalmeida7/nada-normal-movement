import { CategoryPage } from "@/components/CategoryPage";
import { CATEGORY_CONFIG } from "@/config/categories";
import type { Product } from "@/types/product";
import productJacket from "@/assets/product-jacket.jpg";
import productTshirt from "@/assets/product-tshirt.jpg";
import productTank from "@/assets/product-tank.jpg";
import productSocks from "@/assets/product-socks.jpg";

const products: Product[] = [
  {
    id: 1,
    name: "Jaqueta Obsessão",
    price: 449.90,
    image: productJacket,
    tag: "Bestseller",
    tagColor: "bg-nn-orange",
    description: "Oversized com bolsos ocultos. Feita para quem transforma a rua em passarela do caos.",
    material: "100% Nylon Premium | Forro em mesh, bolsos ocultos internos",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto Urbano", hex: "#0d0d0d" },
      { name: "Verde Militar", hex: "#4a5e3a" },
      { name: "Cinza Concreto", hex: "#6b6b6b" },
    ],
  },
  {
    id: 2,
    name: "Moletom Caos Urbano",
    price: 289.90,
    image: productTshirt,
    tag: "Novo",
    tagColor: "bg-nn-lime",
    description: "Algodão premium, capuz ajustável. Conforto que desafia o ordinário.",
    material: "80% Algodão, 20% Poliéster | 360g/m² premium fleece",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto Manifesto", hex: "#0d0d0d" },
      { name: "Cinza Tempestade", hex: "#555555" },
      { name: "Lime Neon", hex: "#a3e635" },
    ],
  },
  {
    id: 3,
    name: "Calça Cargo NN",
    price: 259.90,
    image: productTank,
    tag: null,
    tagColor: null,
    description: "Bolsos utilitários, barra ajustável. Funcionalidade para quem vive em movimento.",
    material: "98% Algodão, 2% Elastano | 6 bolsos utilitários",
    sizes: ["36", "38", "40", "42", "44", "46"],
    colors: [
      { name: "Preto Tático", hex: "#0d0d0d" },
      { name: "Caqui Deserto", hex: "#c2a978" },
    ],
  },
  {
    id: 4,
    name: "Camiseta Oversized Manifesto",
    price: 169.90,
    image: productTshirt,
    tag: "Limitado",
    tagColor: "bg-nn-red",
    description: "Estampa exclusiva, corte largo. Vista sua rebeldia com orgulho.",
    material: "100% Algodão 30.1 | Estampa silk screen",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto Absoluto", hex: "#0d0d0d" },
      { name: "Off-White", hex: "#f5f0e8" },
    ],
  },
  {
    id: 5,
    name: "Bucket Hat Nada Normal",
    price: 99.90,
    image: productSocks,
    tag: null,
    tagColor: null,
    description: "Dupla face, bordado exclusivo. Dois lados da mesma loucura.",
    material: "100% Algodão Canvas | Dupla face, bordado NN",
    sizes: ["P/M", "G/GG"],
    colors: [
      { name: "Preto/Lime", hex: "#0d0d0d" },
      { name: "Bege/Preto", hex: "#d4c5a9" },
    ],
  },
  {
    id: 6,
    name: "Pochete Tática NN",
    price: 129.90,
    image: productJacket,
    tag: "Novo",
    tagColor: "bg-nn-lime",
    description: "Zíper refletivo, alça ajustável. Praticidade para quem carrega o caos.",
    material: "Nylon Cordura 500D | Zíper YKK refletivo",
    sizes: ["Único"],
    colors: [
      { name: "Preto Noturno", hex: "#0d0d0d" },
      { name: "Verde Tático", hex: "#4a5e3a" },
    ],
  },
];

const CategoryStreet = () => (
  <CategoryPage config={CATEGORY_CONFIG.street} products={products} />
);

export default CategoryStreet;
