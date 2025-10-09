import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const {
    loginWithNFID,
    loginWithInternetIdentity,
    logout,
    isLoading,
    isAuthenticated,
    principal,
    username,
    updateUsername,
    loginProvider,
  } = useAuth();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);

  const providerName = loginProvider === "internet-identity" ? "Internet Identity" : "";

  useEffect(() => {
    if (isAuthenticated) {
      setUsernameInput(typeof username === 'string' ? username : "");
      setShowUsernamePrompt(!username);
      setUsernameSaved(false);
      setUsernameError("");
    } else {
      setUsernameInput("");
      setShowUsernamePrompt(false);
      setUsernameSaved(false);
      setUsernameError("");
    }
  }, [isAuthenticated, username]);

  const handleNFIDLogin = async () => {
    if (isLoggingIn || isLoading) {
      return;
    }

    try {
      setIsLoggingIn(true);
      const success = await loginWithNFID();

      if (!success) {
        alert("NFID login was cancelled or failed. Try again and ensure pop-ups are allowed.");
      }
    } catch (error) {
      console.error("NFID login error:", error);
      const detail = error?.message ? ` ${error.message}` : "";
      alert(`An error occurred while connecting to NFID.${detail}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleInternetIdentityLogin = async () => {
    if (isLoggingIn || isLoading) {
      return;
    }

    try {
      setIsLoggingIn(true);
      const success = await loginWithInternetIdentity();

      if (!success) {
        alert("Internet Identity login was cancelled or failed. Try again and ensure pop-ups are allowed.");
      }
    } catch (error) {
      console.error("Internet Identity login error:", error);
      const detail = error?.message ? ` ${error.message}` : "";
      alert(`An error occurred while connecting to Internet Identity.${detail}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUsernameSaved(false);
    setShowUsernamePrompt(false);
    setUsernameError("");
  };

  const handleUsernameSubmit = async (event) => {
    event.preventDefault();
    const trimmed = typeof usernameInput === 'string' ? usernameInput.trim() : '';

    if (trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters long.");
      return;
    }

    if (trimmed.length > 32) {
      setUsernameError("Username must be 32 characters or fewer.");
      return;
    }

    try {
      await updateUsername(trimmed);
      setShowUsernamePrompt(false);
      setUsernameSaved(true);
      setUsernameError("");
    } catch (error) {
      setUsernameError("Failed to save username. Please try again.");
      console.error("Username update failed:", error);
    }
  };

  const handleUsernameEdit = () => {
    setShowUsernamePrompt(true);
    setUsernameSaved(false);
    setUsernameInput(username || "");
    setUsernameError("");
  };

  const handleUsernameCancel = () => {
    if (username) {
      setShowUsernamePrompt(false);
      setUsernameInput(username);
    } else {
      setUsernameInput("");
    }
    setUsernameError("");
  };

  const hasUsername = Boolean(username && typeof username === 'string' && username.trim().length > 0);
  const continueDisabled = !hasUsername || isLoading;
  const principalPreview = principal ? `${principal.slice(0, 6)}...${principal.slice(-4)}` : null;
  const isAnyLoading = isLoading || isLoggingIn;

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 bg-[url('/back2.gif')] bg-cover bg-center">
        <div className="absolute inset-0 backdrop-blur-md bg-black/20"></div>
        <div className="relative z-10 text-center">
          <div className="text-2xl text-foreground mb-4">Checking authentication...</div>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 bg-[url('/back2.gif')] bg-cover bg-center">
      <div className="absolute inset-0 backdrop-blur-md bg-black/20"></div>
      <div className="relative z-10 max-w-md w-full text-center">
        <div className="mb-12">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-16 h-16 text-primary mr-4" />
            <h1 className="text-6xl font-black bg-gradient-hero bg-clip-text text-transparent">MEMENTIC</h1>
          </div>
          <p className="text-xl text-muted-foreground">Enter the Decentralized Meme Economy</p>
        </div>

        <div className="bg-gradient-card border-4 border-primary p-8 rounded-xl shadow-glow">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isAuthenticated
                ? hasUsername
                  ? `Welcome back${username ? `, ${username}` : "!"}`
                  : "Create your username"
                : "Welcome Creator"}
            </h2>
            <p className="text-muted-foreground">
              {isAuthenticated
                ? hasUsername
                  ? `You're connected with ${providerName || "Internet Identity"}. Update your preferences or continue to the app.`
                  : "Pick a username so other creators can recognize you before continuing."
                : "Choose your preferred authentication method to access your decentralized identity."}
            </p>
          </div>

          {!isAuthenticated ? (
             <div className="space-y-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <Button
                   variant="hero"
                   size="xl"
                   className="border-2 border-purple-200 p-4 hero-button"
                   onClick={handleNFIDLogin}
                   disabled={isAnyLoading}
                 >
                   {isAnyLoading ? (
                     <>
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                       Connecting...
                     </>
                   ) : (
                     "Continue with NFID"
                   )}
                 </Button>
                 <Button
                   variant="hero"
                   size="xl"
                   className="border-2 border-cyan-200 p-4 hero-button"
                   onClick={handleInternetIdentityLogin}
                   disabled={isAnyLoading}
                 >
                   {isAnyLoading ? (
                     <>
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                       Connecting...
                     </>
                   ) : (
                     "Continue with Internet Identity"
                   )}
                 </Button>
               </div>
             </div>
           ) : (
            <div className="space-y-6 text-left">
              <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-primary/80">Connected as</p>
                    <p className="text-lg font-semibold text-foreground">{username || "No username yet"}</p>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-muted-foreground">
                    {providerName || "Internet Identity"}
                  </span>
                </div>
                {principalPreview && (
                  <p className="mt-3 text-xs text-muted-foreground break-all">Principal: {principalPreview}</p>
                )}
                {!hasUsername && (
                  <p className="mt-3 text-sm text-yellow-200/80">
                    Add a username to replace your principal across the marketplace.
                  </p>
                )}
                {usernameSaved && hasUsername && (
                  <p className="mt-3 text-xs text-emerald-300">Username saved!</p>
                )}
              </div>

              {showUsernamePrompt || !hasUsername ? (
                <form onSubmit={handleUsernameSubmit} className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Choose a public-facing name. This will appear instead of your Internet Identity.
                  </div>
                  <Input
                    value={usernameInput}
                    onChange={(event) => setUsernameInput(event.target.value)}
                    placeholder="Enter a username"
                    maxLength={32}
                    disabled={isLoading}
                  />
                  {usernameError && <div className="text-xs text-red-300">{usernameError}</div>}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      Save Username
                    </Button>
                    {hasUsername && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1"
                        onClick={handleUsernameCancel}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              ) : (
                <Button variant="ghost" className="w-full" onClick={handleUsernameEdit}>
                  Change Username
                </Button>
              )}

              <div className="space-y-3">
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full border-2 border-green-200 p-4 hero-button"
                  onClick={() => navigate("/myplace")}
                  disabled={continueDisabled}
                >
                  {continueDisabled ? "Add a username to continue" : "Continue to App"}
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
            </div>
          )}

          <div className="text-sm text-muted-foreground mt-6">
            Usernames replace your principal • Secure • Decentralized
          </div>
        </div>

        <div className="mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to landing
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
