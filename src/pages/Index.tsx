import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ModulesSection from "@/components/landing/ModulesSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import RoleFeaturesSection from "@/components/landing/RoleFeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ModulesSection />
      <FeaturesSection />
      <RoleFeaturesSection />
      <PricingSection />
      <Footer />
    </div>
  );
};

export default Index;
