import { Button } from "../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { login, logout, isLoading, isAuthenticated, principal, debugAuth } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log("User already authenticated, redirecting to /create");
      navigate("/create");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async () => {
    if (isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      console.log("Starting login process...");

      const success = await login();

      if (success) {
        console.log("Login successful, will redirect via useEffect");
      } else {
        console.log("Login failed or was cancelled");
        alert("Login failed or was cancelled. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };
  

  const handleLogout = async () => {
    try {
      console.log("Logging out...");
      const success = await logout();
      if (success) {
        console.log("Logout successful");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 bg-[url('/back2.gif')] bg-cover bg-center">
        <div className="absolute inset-0 backdrop-blur-md bg-black/20"></div>
        <div className="relative z-10 text-center">
          <div className="text-2xl text-foreground mb-4">
            Checking authentication...
          </div>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 bg-[url('/back2.gif')] bg-cover bg-center">
      <div className="absolute inset-0 backdrop-blur-md bg-black/20"></div>
      <div className="relative z-10 max-w-md w-full text-center">
        {/* Logo/Brand Section */}
        <div className="mb-12">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-16 h-16 text-primary mr-4" />
            <h1 className="text-6xl font-black bg-gradient-hero bg-clip-text text-transparent">
              MEMENTIC
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Enter the Decentralized Meme Economy
          </p>
        </div>

        {/* Login Gateway */}
        <div className="bg-gradient-card border-4 border-primary p-8 rounded-xl shadow-glow">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isAuthenticated ? "Welcome Back!" : "Welcome Creator"}
            </h2>
            <p className="text-muted-foreground">
              {isAuthenticated
                ? "You're already logged in. Continue to the app or logout."
                : "Access your digital identity to start creating viral content"}
            </p>
          </div>

          {!isAuthenticated ? (
            <Button
              variant="hero"
              size="xl"
              className="w-full mb-6 border-2 border-purple-200 p-4 hero-button"
              onClick={handleLogin}
              disabled={isLoggingIn || isLoading}
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Logging in...
                </>
              ) : (
                "Login with Internet Identity"
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <Button
                variant="hero"
                size="xl"
                className="w-full border-2 border-green-200 p-4 hero-button"
                onClick={() => navigate("/create")}
              >
                Continue to App
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-2 border-red-200 p-2"
                onClick={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? "Logging out..." : "Logout"}
              </Button>
            </div>
          )}


          <div className="text-sm text-muted-foreground mt-6">
            Secure • Decentralized • Anonymous
          </div>
        </div>

        {/* Back to Landing Link */}
        <div className="mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to Landing Page
          </Button>
        </div>

        {/* Visual Elements */}
        <div className="mt-12 flex justify-center space-x-4">
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse-glow"></div>
          <div
            className="w-4 h-4 bg-secondary rounded-full animate-pulse-glow"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="w-4 h-4 bg-accent rounded-full animate-pulse-glow"
            style={{ animationDelay: "0.4s" }}
          ></div>
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-2 bg-black/20 rounded text-xs text-muted-foreground">
            Debug: isLoading={isLoading.toString()}, isAuthenticated=
            {isAuthenticated.toString()}, principal={principal || "null"}
            <button
              onClick={() => debugAuth()}
              className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Debug Auth
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
