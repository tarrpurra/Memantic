import { Link } from "react-router-dom";
import {
  Clock,
  Gavel,
  ArrowRight,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import PageShell from "../components/layout/PageShell";

const Auction = () => {
  return (
    <PageShell mainClassName="gap-16">
      <section className="page-section space-y-8 pt-2">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="overflow-hidden rounded-3xl border border-border/50 bg-background/75 p-6 shadow-card backdrop-blur-xl sm:p-12">
            <div className="flex flex-col gap-6 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
              <div className="space-y-4">
                <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:mx-0">
                  <Gavel className="h-4 w-4 text-primary" />
                  Auction Arena
                </span>
                <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  Live auction experience
                </h1>
                <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:mx-0 sm:text-base">
                  Real-time bidding, creator rewards, and collector engagement for the most viral memes.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:w-auto lg:flex-col lg:items-stretch">
                <Link to="/myplace" className="flex-1">
                  <Button variant="hero" size="xl" className="w-full rounded-full px-8">
                    Create Memes
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/marketplace" className="flex-1">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-full border-border/60 bg-background/70"
                  >
                    Browse Marketplace
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Card className="text-center max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Clock className="w-12 h-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl mb-2">Coming Soon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The auction feature is currently under development. We're building an advanced bidding system with real-time updates, creator rewards, and collector engagement features.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/marketplace">
                  <Button variant="outline">
                    Explore Marketplace
                  </Button>
                </Link>
                <Link to="/myplace">
                  <Button>
                    Create Memes
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
};

export default Auction;
