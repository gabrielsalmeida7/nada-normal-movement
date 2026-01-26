import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategorySection } from "@/components/CategorySection";
import { PillarsSection } from "@/components/PillarsSection";
import { ProductsSection } from "@/components/ProductsSection";
import { CommunitySection } from "@/components/CommunitySection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <CategorySection />
        <PillarsSection />
        <ProductsSection />
        <CommunitySection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
