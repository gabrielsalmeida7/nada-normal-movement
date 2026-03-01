import { CategoryPage } from "@/components/CategoryPage";
import { CATEGORY_CONFIG } from "@/config/categories";
import type { Product } from "@/types/product";
import productTshirt from "@/assets/product-tshirt.jpg";
import productTank from "@/assets/product-tank.jpg";
import productJacket from "@/assets/product-jacket.jpg";
import productSocks from "@/assets/product-socks.jpg";

const products: Product[] = [
  {
    id: 1,
    name: "Polo Premium NN",
    price: 199.90,
    image: productTshirt,
    tag: "Novo",
    tagColor: "bg-nn-lime",
    description: "Piqué algodão com bordado discreto. Elegância que não pede licença.",
    material: "100% Algodão Piqué | Bordado NN no peito",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto Clássico", hex: "#0d0d0d" },
      { name: "Branco Premium", hex: "#f5f5f5" },
      { name: "Amarelo Caos", hex: "#facc15" },
    ],
  },
  {
    id: 2,
    name: "Camiseta Social Caos",
    price: 159.90,
    image: productTank,
    tag: null,
    tagColor: null,
    description: "Corte slim, tecido macio. Para quando a resenha exige estilo sem esforço.",
    material: "95% Algodão Penteado, 5% Elastano | Corte slim fit",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto Essencial", hex: "#0d0d0d" },
      { name: "Cinza Médio", hex: "#888888" },
      { name: "Off-White", hex: "#f5f0e8" },
    ],
  },
  {
    id: 3,
    name: "Bermuda Resenha",
    price: 179.90,
    image: productJacket,
    tag: "Bestseller",
    tagColor: "bg-nn-orange",
    description: "Tecido confortável, bolsos laterais. Conforto que acompanha do treino à resenha.",
    material: "76% Algodão, 24% Poliéster | Cós elástico com cordão",
    sizes: ["PP", "P", "M", "G", "GG"],
    colors: [
      { name: "Preto", hex: "#0d0d0d" },
      { name: "Caqui", hex: "#c2a978" },
      { name: "Azul Marinho", hex: "#1e3a5f" },
    ],
  },
  {
    id: 4,
    name: "Chinelo Slide NN",
    price: 119.90,
    image: productSocks,
    tag: "Novo",
    tagColor: "bg-nn-yellow",
    description: "Solado ergonômico, logo em relevo. Descanse os pés com atitude.",
    material: "EVA injetado ergonômico | Logo NN em alto relevo",
    sizes: ["35-36", "37-38", "39-40", "41-42", "43-44"],
    colors: [
      { name: "Preto/Amarelo", hex: "#0d0d0d" },
      { name: "Branco/Preto", hex: "#f5f5f5" },
    ],
  },
  {
    id: 5,
    name: "Ecobag Nada Normal",
    price: 49.90,
    image: productTshirt,
    tag: "Limitado",
    tagColor: "bg-nn-red",
    description: "100% algodão orgânico. Carregue seu manifesto por onde for.",
    material: "100% Algodão Orgânico | Estampa serigrafia ecológica",
    sizes: ["Único"],
    colors: [
      { name: "Cru Natural", hex: "#e8dcc8" },
      { name: "Preto", hex: "#0d0d0d" },
    ],
  },
  {
    id: 6,
    name: "Boné Dad Hat NN",
    price: 89.90,
    image: productTank,
    tag: null,
    tagColor: null,
    description: "Aba curva, fecho regulável. Estilo descomplicado para quem vive no automático — mas por escolha.",
    material: "100% Algodão lavado | Bordado frontal, fecho metálico",
    sizes: ["Único"],
    colors: [
      { name: "Preto", hex: "#0d0d0d" },
      { name: "Bege", hex: "#d4c5a9" },
      { name: "Amarelo", hex: "#facc15" },
    ],
  },
];

const CategorySocial = () => (
  <CategoryPage config={CATEGORY_CONFIG.social} products={products} />
);

export default CategorySocial;
