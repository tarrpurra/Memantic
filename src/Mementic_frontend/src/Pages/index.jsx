import { HeroSection } from "../components/HeroSection";
import { MemeGenerator } from "../components/MemeGenerator";
import { MemeGallery } from "../components/MemeGallery";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            Create Viral Memes with AI
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Turn your ideas into viral content and earn from the crypto community
          </p>
        </div>
        <MemeGenerator />
      </section>

      <MemeGallery />
    </div>
  );
};

export default Index;
