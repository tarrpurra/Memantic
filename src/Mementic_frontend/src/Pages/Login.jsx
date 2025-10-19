import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  LogIn,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/Button";
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
  "Saved usernames live in your profile and follow you across the UI.",
];

const VALUE_PILLS = ["NFID ready", "Internet Identity native", "Profile personalization"];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state ?? {};
  const fromPath = locationState?.from;
  const requireUsername = Boolean(locationState?.requireUsername);
  const {
    loginWithNFID,
    loginWithInternetIdentity,
    logout,
    isLoading,
    isAuthenticated,
    principal,
    username,
    loginProvider,
  } = useAuth();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authProvider, setAuthProvider] = useState(null); // "nfid" or "internet-identity"

  const trimmedUsername = typeof username === "string" ? username.trim() : "";
  const hasUsername = trimmedUsername.length > 0;

  const providerName =
    loginProvider === "internet-identity"
      ? "Internet Identity"
      : loginProvider === "nfid"
      ? "NFID"
      : "";

  const redirectHandledRef = useRef(false);
  const redirectMessage = requireUsername
    ? "Finish your profile so the community can recognize you across Memantic."
    : fromPath
    ? "Sign in to continue to your destination."
    : "";

  useEffect(() => {
    // Only redirect if not loading and authenticated
    if (isLoading || !isAuthenticated) {
      redirectHandledRef.current = false;
      return;
    }

    if (!hasUsername) {
      redirectHandledRef.current = true;
      const nextState = { requireUsername: true };
      if (fromPath) {
        nextState.from = fromPath;
      }
      navigate("/portfolio", { replace: true, state: nextState });
      return;
    }

    if (!redirectHandledRef.current && fromPath) {
      redirectHandledRef.current = true;
      navigate(fromPath, { replace: true, state: undefined });
    }
  }, [fromPath, hasUsername, isAuthenticated, navigate, isLoading]);

  useEffect(() => {
    if (!isAuthenticated) {
      redirectHandledRef.current = false;
    }
  }, [isAuthenticated]);

  const handleNFIDLogin = async () => {
    if (isLoggingIn || isLoading) {
      return;
    }

    try {
      setIsLoggingIn(true);
      setAuthProvider("nfid");
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
      setAuthProvider(null);
    }
  };

  const handleInternetIdentityLogin = async () => {
    if (isLoggingIn || isLoading) {
      return;
    }

    try {
      setIsLoggingIn(true);
      setAuthProvider("internet-identity");
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
      setAuthProvider(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleOpenProfile = () => {
    const nextState = hasUsername ? {} : { requireUsername: true };
    if (fromPath) {
      nextState.from = fromPath;
    }
    navigate("/portfolio", { state: Object.keys(nextState).length ? nextState : undefined });
  };

  const handleOpenCreatorStudio = () => {
    navigate("/myplace");
  };

  const isAnyLoading = isLoading || isLoggingIn;

  // Show authentication checking state during login process
  if (isLoggingIn && authProvider) {
    const providerName = authProvider === "internet-identity" ? "Internet Identity" : "NFID";
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
            <div className="text-lg font-medium text-muted-foreground">
              Checking authentication with {providerName}…
            </div>
            <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-cyan-500/10 to-pink-500/10 dark:from-purple-500/20 dark:via-cyan-500/20 dark:to-pink-500/20 animate-pulse" />
        <div className="hero-aurora opacity-30 dark:opacity-60" />
        <div className="hero-grid opacity-20 dark:opacity-40" />
        <div className="hero-sparkles opacity-60 dark:opacity-80" />
      </div>

      <Navigation />

      <main className="relative z-10 px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.section
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-purple-600 dark:text-purple-300"
            >
              <Sparkles className="h-5 w-5 text-purple-500 dark:text-purple-400 animate-pulse" />
              <span>Welcome to Memantic</span>
            </motion.div>
            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-balance text-5xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-gray-900 via-purple-800 to-cyan-800 dark:from-white dark:via-purple-200 dark:to-cyan-200 bg-clip-text text-transparent"
              >
                Unlock Your Creative Identity
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="mt-6 max-w-2xl text-lg text-gray-600 dark:text-slate-300 sm:text-xl leading-relaxed"
              >
                Seamlessly connect your decentralized identity to create, trade, and build in the ultimate meme ecosystem. Your profile syncs across all platforms instantly.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="space-y-6"
            >
              {LOGIN_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                    whileHover={{ scale: 1.02, x: 10 }}
                    className="group flex items-start gap-4 rounded-2xl border border-purple-200/50 dark:border-purple-500/20 bg-gradient-to-r from-white/70 to-purple-50/70 dark:from-slate-800/50 dark:to-slate-900/50 p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl hover:border-purple-300/60 dark:hover:border-purple-400/40 hover:shadow-purple-200/20 dark:hover:shadow-purple-500/20 transition-all duration-300"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/60 to-cyan-400/60 text-white shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-200 transition-colors duration-300">{feature.title}</h3>
                      <p className="text-gray-600 dark:text-slate-300 leading-relaxed mt-1">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              {VALUE_PILLS.map((pill, index) => (
                <motion.span
                  key={pill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="inline-flex items-center gap-2 rounded-full border border-purple-300/40 dark:border-purple-400/30 bg-gradient-to-r from-purple-100/70 to-cyan-100/70 dark:from-purple-500/20 dark:to-cyan-500/20 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-200 shadow-lg hover:shadow-purple-300/40 dark:hover:shadow-purple-500/30 transition-all duration-300"
                >
                  <CheckCircle2 className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                  {pill}
                </motion.span>
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl border border-purple-200/50 dark:border-purple-500/30 bg-gradient-to-br from-white/95 to-purple-50/95 dark:from-slate-800/90 dark:to-slate-900/90 p-10 shadow-2xl dark:shadow-2xl backdrop-blur-xl hover:shadow-purple-200/20 dark:hover:shadow-purple-500/20 transition-all duration-500">
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-200/30 via-cyan-100/20 to-pink-100/30 dark:from-purple-600/20 dark:via-cyan-500/10 dark:to-pink-500/20" />
              <div className="relative z-10 space-y-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="space-y-4 text-left"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-purple-300/50 dark:border-purple-400/40 bg-purple-100/70 dark:bg-purple-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-purple-700 dark:text-purple-200">
                    <LogIn className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>{isAuthenticated ? "Connected" : "Choose Provider"}</span>
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl leading-tight">
                    {isAuthenticated
                      ? hasUsername
                        ? `Welcome back${trimmedUsername ? `, ${trimmedUsername}` : "!"}`
                        : "Complete Your Profile"
                      : "Join the Ecosystem"}
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-slate-300 leading-relaxed">
                    {isAuthenticated
                      ? hasUsername
                        ? `Connected with ${providerName || "Internet Identity"}. Ready to create amazing memes?`
                        : "Set up your profile to personalize your experience across the platform."
                      : "Connect your decentralized identity to start creating and trading memes."}
                  </p>
                </motion.div>

                {redirectMessage && (
                  <div className="rounded-2xl border border-amber-300/60 bg-amber-50/80 dark:border-amber-300/50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-100">
                    {redirectMessage}
                  </div>
                )}

                {!isAuthenticated ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          variant="hero"
                          size="xl"
                          className="w-full h-14 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 flex items-center justify-center gap-3 border border-purple-400/50 dark:border-purple-400/50 shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/50 transition-all duration-300 text-white font-semibold"
                          onClick={handleNFIDLogin}
                          disabled={isAnyLoading}
                        >
                          {isAnyLoading ? (
                            <>
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Connecting…
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-5 w-5" />
                              Continue with NFID
                            </>
                          )}
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          variant="hero"
                          size="xl"
                          className="w-full h-14 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 flex items-center justify-center gap-3 border border-cyan-400/50 dark:border-cyan-400/50 shadow-lg hover:shadow-cyan-500/50 dark:hover:shadow-cyan-500/50 transition-all duration-300 text-white font-semibold"
                          onClick={handleInternetIdentityLogin}
                          disabled={isAnyLoading}
                        >
                          {isAnyLoading ? (
                            <>
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Connecting…
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-5 w-5" />
                              Internet Identity
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="text-sm text-gray-500 dark:text-slate-400 text-center"
                    >
                      🔐 Pop-ups must be enabled for secure authentication
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="space-y-8 text-left"
                  >
                    <div className="rounded-2xl border border-purple-200/50 dark:border-purple-500/30 bg-gradient-to-br from-white/70 to-purple-50/70 dark:from-slate-800/70 dark:to-slate-900/70 p-6 shadow-xl dark:shadow-xl">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm uppercase tracking-[0.2em] text-purple-600 dark:text-purple-300 font-medium">Connected as</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{hasUsername ? trimmedUsername : "No username yet"}</p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/50 dark:border-cyan-400/40 bg-cyan-100/70 dark:bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-200">
                          <ShieldCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          {providerName || "Internet Identity"}
                        </span>
                      </div>
                      {!hasUsername && (
                        <p className="mt-4 text-lg text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-200/50 dark:border-amber-400/30">
                          ✨ Set up your username to personalize your identity across the platform!
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {!hasUsername ? (
                        <>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              variant="hero"
                              size="xl"
                              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 border border-emerald-400/50 dark:border-emerald-400/50 shadow-lg hover:shadow-emerald-500/50 dark:hover:shadow-emerald-500/50 transition-all duration-300 text-white font-semibold"
                              onClick={handleOpenProfile}
                            >
                              Complete Profile Setup
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              variant="outline"
                              size="lg"
                              className="w-full h-12 border-2 border-red-500/60 dark:border-red-400/50 text-red-600 dark:text-red-300 hover:bg-red-50/70 dark:hover:bg-red-500/20 hover:border-red-600 dark:hover:border-red-400 transition-all duration-300"
                              onClick={handleLogout}
                              disabled={isAnyLoading}
                            >
                              {isAnyLoading ? "Logging out…" : "Logout"}
                            </Button>
                          </motion.div>
                        </>
                      ) : (
                        <>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              variant="hero"
                              size="xl"
                              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 border border-emerald-400/50 dark:border-emerald-400/50 shadow-lg hover:shadow-emerald-500/50 dark:hover:shadow-emerald-500/50 transition-all duration-300 text-white font-semibold"
                              onClick={handleOpenCreatorStudio}
                            >
                              🚀 Enter Creator Studio
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              variant="ghost"
                              size="lg"
                              className="w-full h-12 text-purple-600 dark:text-purple-300 hover:bg-purple-100/70 dark:hover:bg-purple-500/20 hover:text-purple-700 dark:hover:text-purple-200 transition-all duration-300"
                              onClick={handleOpenProfile}
                            >
                              Manage Profile
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              variant="outline"
                              size="lg"
                              className="w-full h-12 border-2 border-red-500/60 dark:border-red-400/50 text-red-600 dark:text-red-300 hover:bg-red-50/70 dark:hover:bg-red-500/20 hover:border-red-600 dark:hover:border-red-400 transition-all duration-300"
                              onClick={handleLogout}
                              disabled={isAnyLoading}
                            >
                              {isAnyLoading ? "Logging out…" : "Logout"}
                            </Button>
                          </motion.div>
                        </>
                      )}
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="rounded-2xl border border-purple-200/50 dark:border-purple-500/30 bg-gradient-to-br from-white/70 to-purple-50/70 dark:from-slate-800/70 dark:to-slate-900/70 px-6 py-5 text-left"
                    >
                      <div className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                        <ShieldCheck className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                        Secure Identity Flow
                      </div>
                      <ul className="space-y-3">
                        {TRUST_POINTS.map((point, index) => (
                          <motion.li
                            key={point}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.9 + index * 0.1, duration: 0.4 }}
                            className="flex items-start gap-3"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-slate-300 leading-relaxed">{point}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};

export default Login;
