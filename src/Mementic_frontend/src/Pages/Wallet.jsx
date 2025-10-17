import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import Navigation from "../components/Navigation";
import {
  Sparkles,
  ArrowLeft,
  Clock,
  Wallet,
} from "lucide-react";

const Wallet_Page = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Page Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/portfolio")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Wallet
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  ICP wallet management and transactions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
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
              The wallet feature is currently under development. We're working hard to bring you a seamless ICP wallet experience with transaction management, balance tracking, and more.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/portfolio")}
              >
                Go to Portfolio
              </Button>
              <Button
                onClick={() => navigate("/marketplace")}
              >
                Browse Marketplace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet_Page;
