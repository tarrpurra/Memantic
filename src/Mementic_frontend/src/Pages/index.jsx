import { HeroSection } from "../components/HeroSection";
import { MemeGenerator } from "../components/MemeGenerator";
import { MemeGallery } from "../components/MemeGallery";
import PageShell from "../components/layout/PageShell";

const Index = () => {
  return (
    <PageShell withBackground={false} mainClassName="gap-12 pb-12">
      <section className="page-section space-y-12 py-10">
        <HeroSection />

        <div className="mx-auto max-w-4xl space-y-6 text-center">
          <h2 className="text-4xl font-bold text-foreground md:text-5xl">
            Create Viral Memes with AI
          </h2>
          <p className="text-lg text-muted-foreground md:text-xl">
            Turn your ideas into viral content and earn from the crypto community
          </p>
        </div>

        <MemeGenerator />
        <MemeGallery />
      </section>
    </PageShell>
  );
};

export default Index;
