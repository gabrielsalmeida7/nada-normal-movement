import categoryRunning from "@/assets/running-hero.png";
import categoryStreet from "@/assets/street-hero.png";
import categorySocial from "@/assets/category-social.jpg";
import type { CategoryPageConfig } from "@/components/CategoryPage";

export const CATEGORY_CONFIG: Record<"running" | "street" | "social", CategoryPageConfig> = {
  running: {
    title: "RUNNING",
    subtitle: "Obsessão em Movimento. Para quem acorda às 4h da manhã e chama isso de privilégio.",
    accentKey: "nn-orange",
    heroImage: categoryRunning,
    heroImageAlt: "Running",
    titleGlowClass: "glow-text-orange",
    linkColorClass: "text-nn-orange hover:text-nn-yellow",
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
    linkColorClass: "text-nn-lime hover:text-nn-yellow",
    barClass: "bg-nn-lime",
    titleColorClass: "text-nn-lime",
  },
  social: {
    title: "SOCIAL",
    subtitle: "Caos Coletivo. Porque a resenha pós-treino é tão importante quanto o treino.",
    accentKey: "nn-yellow",
    heroImage: categorySocial,
    heroImageAlt: "Social",
    titleGlowClass: "glow-text-yellow",
    linkColorClass: "text-nn-yellow hover:text-nn-orange",
    barClass: "bg-nn-yellow",
    titleColorClass: "text-nn-yellow",
  },
};
