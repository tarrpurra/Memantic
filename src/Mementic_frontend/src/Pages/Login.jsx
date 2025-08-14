import { Button } from "../components/ui/button";
import { useNavigate } from "react-router";

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Logo/Brand Section */}
        <div className="mb-12">
          <h1 className="text-6xl font-black bg-gradient-hero bg-clip-text text-transparent mb-4">
            MEMENTIC
          </h1>
          <p className="text-xl text-muted-foreground">
            Enter the Decentralized Meme Economy
          </p>
        </div>

        {/* Login Gateway */}
        <div className="bg-gradient-card border-4 border-primary p-8 rounded-xl shadow-glow">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome Creator
            </h2>
            <p className="text-muted-foreground">
              Access your digital identity to start creating viral content
            </p>
          </div>

          <Button 
            variant="hero" 
            size="xl" 
            className="w-full mb-6"
            onClick={() => navigate("/")}
          >
            Login with Internet Identity
          </Button>

          <div className="text-sm text-muted-foreground">
            Secure • Decentralized • Anonymous
          </div>
        </div>

        {/* Visual Elements */}
        <div className="mt-12 flex justify-center space-x-4">
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse-glow"></div>
          <div className="w-4 h-4 bg-secondary rounded-full animate-pulse-glow" style={{animationDelay: '0.2s'}}></div>
          <div className="w-4 h-4 bg-accent rounded-full animate-pulse-glow" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>
    </div>
  );
};

export default Login;