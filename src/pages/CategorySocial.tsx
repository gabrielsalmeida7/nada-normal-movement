import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard, Product } from "@/components/ProductCard";
import productTshirt from "@/assets/product-tshirt.jpg";
import productTank from "@/assets/product-tank.jpg";
import productSocks from "@/assets/product-socks.jpg";
import productJacket from "@/assets/product-jacket.jpg";
import categorySocial from "@/assets/category-social.jpg";

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

const CategorySocial = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Banner */}
        <section className="relative h-[60vh] min-h-[400px] flex items-end overflow-hidden mt-28">
          <img
            src={categorySocial}
            alt="Social"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute top-0 left-0 w-full h-2 bg-nn-yellow" />

          <div className="container relative z-10 pb-12">
            <Link
              to="/home"
              className="inline-flex items-center gap-2 text-nn-yellow font-display text-sm tracking-wider mb-6 hover:text-nn-orange transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar
            </Link>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-6xl md:text-8xl text-nn-yellow glow-text-yellow mb-4"
            >
              SOCIAL
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-foreground/80 text-lg max-w-xl"
            >
              Caos Coletivo. Porque a resenha pós-treino é tão importante quanto o treino.
            </motion.p>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16 bg-background">
          <div className="container">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-muted-foreground mb-10 font-display text-sm tracking-widest"
            >
              {products.length} PRODUTOS
            </motion.p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  accentColor="nn-yellow"
                  shadowClass="shadow-neon-yellow"
                />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CategorySocial;
