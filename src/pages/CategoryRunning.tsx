import { CategoryPage } from "@/components/CategoryPage";
import { CATEGORY_CONFIG } from "@/config/categories";
import type { Product } from "@/types/product";
import productTshirt from "@/assets/product-tshirt.jpg";
import productSocks from "@/assets/product-socks.jpg";
import productJacket from "@/assets/product-jacket.jpg";
import productTank from "@/assets/product-tank.jpg";
<<<<<<< Updated upstream
import categoryRunning from "@/assets/running-hero.png";
=======
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
const CategoryRunning = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Banner */}
        <section className="mt-28">
          <div className="relative w-full overflow-hidden">
            <img
              src={categoryRunning}
              alt="Running"
              className="w-full h-auto object-contain"
            />
            <div className="absolute top-0 left-0 w-full h-2 bg-nn-orange" />
          </div>
          <div className="container py-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-6xl md:text-8xl text-nn-orange glow-text-orange mb-4"
            >
              RUNNING
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-foreground/80 text-lg max-w-xl"
            >
              Obsessão em Movimento. Para quem acorda às 4h da manhã e chama isso de privilégio.
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
                  accentColor="nn-orange"
                  shadowClass="shadow-neon-orange"
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
=======
const CategoryRunning = () => (
  <CategoryPage config={CATEGORY_CONFIG.running} products={products} />
);
>>>>>>> Stashed changes

export default CategoryRunning;
