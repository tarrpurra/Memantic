import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";
import Navigation from "../components/Navigation";

const LOGIN_FEATURES = [
  {
    icon: Sparkles,
    title: "Creator-first onboarding",
    description: "Carry your identity into creation, marketplace, and auction flows without reconfiguring settings.",
  },
  {
    icon: Activity,
    title: "Real-time sync",
    description: "Profile updates instantly reach the marketplace and auction dashboards for a seamless experience.",
  },
  {
    icon: Zap,
    title: "Fast multi-provider access",
    description: "Choose NFID or Internet Identity and return to building in seconds with cached sessions.",
  },
];

const TRUST_POINTS = [
  "No passwords stored — only decentralized identities are used to sign in.",
  "Automatic agent configuration keeps your backend calls authenticated.",
  "Saved usernames replace long principals everywhere in the UI.",
];

const VALUE_PILLS = ["NFID ready", "Internet Identity native", "Username personalization"];

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

  const providerName =
    loginProvider === "internet-identity"
      ? "Internet Identity"
      : loginProvider === "nfid"
      ? "NFID"
      : "";

  useEffect(() => {
    if (isAuthenticated) {
      setUsernameInput(typeof username === "string" ? username : "");
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
    const trimmed = typeof usernameInput === "string" ? usernameInput.trim() : "";

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

  const hasUsername = Boolean(username && typeof username === "string" && username.trim().length > 0);
  const continueDisabled = !hasUsername || isLoading;
  const principalPreview = principal ? `${principal.slice(0, 6)}...${principal.slice(-4)}` : null;
  const isAnyLoading = isLoading || isLoggingIn;

  if (isLoading && !isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-background text-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="hero-aurora" />
          <div className="hero-grid" />
          <div className="hero-sparkles" />
        </div>
        <Navigation />
        <main className="relative z-10 flex min-h-[60vh] items-center justify-center px-6 py-24 sm:px-8">
          <div className="text-center">
            <div className="text-lg font-medium text-muted-foreground">Checking authentication…</div>
            <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="hero-aurora" />
        <div className="hero-grid" />
        <div className="hero-sparkles" />
      </div>

      <Navigation />

      <main className="relative z-10 px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Sign in to launch</span>
            </div>
            <div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Unlock your meme identity across the ecosystem
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Connect once to sync your creator profile, track credits, and publish seamlessly to the pre-marketplace, auctions,
                and NFT drops.
              </p>
            </div>

            <div className="space-y-4">
              {LOGIN_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group flex items-start gap-3 rounded-2xl border border-border/50 bg-background/70 p-4 shadow-card backdrop-blur"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/40 to-cyan-400/30 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground sm:text-base">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              {VALUE_PILLS.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {pill}
                </span>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-8 shadow-card backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/15 via-transparent to-cyan-400/15" />
              <div className="relative z-10 space-y-8">
                <div className="space-y-3 text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                    <LogIn className="h-3.5 w-3.5 text-primary" />
                    <span>{isAuthenticated ? "Connected" : "Choose a provider"}</span>
                  </div>
                  <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                    {isAuthenticated
                      ? hasUsername
                        ? `Welcome back${username ? `, ${username}` : "!"}`
                        : "Pick a username to finish setup"
                      : "Access your creator control center"}
                  </h2>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    {isAuthenticated
                      ? hasUsername
                        ? `You're connected with ${providerName || "Internet Identity"}. Customize your profile or jump right into creation.`
                        : "Add a username so the community sees your chosen identity instead of a principal."
                      : "Sign in with NFID or Internet Identity to sync your profile, credits, and publishing permissions."}
                  </p>
                </div>

                {!isAuthenticated ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Button
                        variant="hero"
                        size="xl"
                        className="hero-button flex items-center justify-center gap-2 border border-purple-300/50"
                        onClick={handleNFIDLogin}
                        disabled={isAnyLoading}
                      >
                        {isAnyLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Connecting…
                          </>
                        ) : (
                          "Continue with NFID"
                        )}
                      </Button>
                      <Button
                        variant="hero"
                        size="xl"
                        className="hero-button flex items-center justify-center gap-2 border border-cyan-300/50"
                        onClick={handleInternetIdentityLogin}
                        disabled={isAnyLoading}
                      >
                        {isAnyLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Connecting…
                          </>
                        ) : (
                          "Continue with Internet Identity"
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Pop-ups must be enabled to complete decentralized authentication flows.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 text-left">
                    <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Connected as</p>
                          <p className="text-lg font-semibold text-foreground">{username || "No username yet"}</p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          {providerName || "Internet Identity"}
                        </span>
                      </div>
                      {principalPreview && (
                        <p className="mt-3 break-all text-xs text-muted-foreground">Principal: {principalPreview}</p>
                      )}
                      {!hasUsername && (
                        <p className="mt-3 text-sm text-amber-200/80">
                          Add a username to replace your principal across the marketplace.
                        </p>
                      )}
                      {usernameSaved && hasUsername && (
                        <p className="mt-3 text-xs text-emerald-300">Username saved!</p>
                      )}
                    </div>

                    {showUsernamePrompt || !hasUsername ? (
                      <form onSubmit={handleUsernameSubmit} className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <UserPlus className="h-4 w-4 text-primary" />
                          <span>Choose a public-facing username</span>
                        </div>
                        <Input
                          value={usernameInput}
                          onChange={(event) => setUsernameInput(event.target.value)}
                          placeholder="Enter a username"
                          maxLength={32}
                          disabled={isLoading}
                        />
                        {usernameError && <div className="text-xs text-red-300">{usernameError}</div>}
                        <div className="flex flex-col gap-2 sm:flex-row">
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
                        className="w-full hero-button border border-emerald-300/60"
                        onClick={() => navigate("/myplace")}
                        disabled={continueDisabled}
                      >
                        {continueDisabled ? "Add a username to continue" : "Continue to creator studio"}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full border border-border/50"
                        onClick={handleLogout}
                        disabled={isLoading}
                      >
                        {isLoading ? "Logging out…" : "Logout"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-4 text-left text-xs text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Verified identity flow
                  </div>
                  <ul className="space-y-1.5">
                    {TRUST_POINTS.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};

export default Login;
