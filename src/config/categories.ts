import categoryRunning from "@/assets/running-hero.png";
import categoryStreet from "@/assets/street-hero.png";
// import categorySocial from "@/assets/category-social.jpg"; // Social comentado por enquanto
import type { CategoryPageConfig } from "@/components/CategoryPage";

export const CATEGORY_CONFIG: Record<"running" | "street", CategoryPageConfig> = {
  running: {
    title: "RUNNING",
    subtitle: "Obsessão em Movimento. Para quem acorda às 4h da manhã e chama isso de privilégio.",
    accentKey: "nn-orange",
    heroImage: categoryRunning,
    heroImageAlt: "Running",
    titleGlowClass: "glow-text-orange",
    barClass: "bg-nn-orange",
    titleColorClass: "text-nn-orange",
  },
  street: {
    title: "STREET",
    subtitle: "Autenticidade Urbana. Leve o caos para as ruas. Vista sua anormalidade.",
    accentKey: "nn-lime",
    heroImage: categoryStreet,
    heroImageAlt: "Street",
    titleGlowClass: "glow-text-lime",
    barClass: "bg-nn-lime",
    titleColorClass: "text-nn-lime",
  },
  // Social comentado por enquanto — descomentar quando for utilizar
  // social: {
  //   title: "SOCIAL",
  //   subtitle: "Caos Coletivo. Porque a resenha pós-treino é tão importante quanto o treino.",
  //   accentKey: "nn-yellow",
  //   heroImage: categorySocial,
  //   heroImageAlt: "Social",
  //   titleGlowClass: "glow-text-yellow",
  //   barClass: "bg-nn-yellow",
  //   titleColorClass: "text-nn-yellow",
  // },
};
