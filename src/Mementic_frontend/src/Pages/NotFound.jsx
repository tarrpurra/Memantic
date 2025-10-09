import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import Navigation from "../components/Navigation";
import { Button } from "../components/ui/Button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="hero-aurora" />
        <div className="hero-grid" />
        <div className="hero-sparkles" />
      </div>

      <Navigation />

      <main className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            <SearchX className="h-4 w-4 text-primary" />
            <span>404 — Missing meme</span>
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            We looked everywhere, but this page escaped the memeverse
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            The route <span className="font-semibold text-foreground">{location.pathname}</span> isn’t mapped yet. Use the links below to
            head back to the main experience and continue creating, collecting, or bidding.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="hero"
              size="lg"
              className="inline-flex items-center gap-2 sm:min-w-[200px]"
              onClick={() => navigate("/")}
            >
              <Home className="h-4 w-4" />
              Back to landing
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="inline-flex items-center gap-2 sm:min-w-[200px]"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Return to previous page
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
