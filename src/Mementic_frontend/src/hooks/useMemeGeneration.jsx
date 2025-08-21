import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "./use-toast";

export const useMemeGeneration = () => {
  const MEME_GEN_BASE_URL = "https://meme-generator-0kk3.onrender.com";

  const normalizeMemeResponse = (raw) => {
    if (!raw || typeof raw !== "object") return raw;

    // Prefer explicit image_url if present
    let imageUrl = raw.image_url || raw.url;

    // If server returned a relative path, prefix the generator base URL
    if (imageUrl && imageUrl.startsWith("/")) {
      imageUrl = `${MEME_GEN_BASE_URL}${imageUrl}`;
    }

    // If base64 is returned, convert to data URL
    if (!imageUrl && (raw.image_base64 || raw.base64 || raw.imageData)) {
      const base64 = raw.image_base64 || raw.base64 || raw.imageData;
      imageUrl = `data:image/jpeg;base64,${base64}`;
    }

    // Fallback metadata mapping
    const metadata = raw.metadata || raw.meta || {};
    const imageFilename = raw.image_filename || raw.filename || undefined;

    return {
      ...raw,
      image_url: imageUrl,
      image_filename: imageFilename,
      metadata,
    };
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMeme, setGeneratedMeme] = useState(null);
  const [generationHistory, setGenerationHistory] = useState([]);

  // Add error boundary and debugging
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.error("Failed to get auth context:", error);
    // Return safe defaults if auth context fails
    return {
      isGenerating: false,
      generatedMeme: null,
      generationHistory: [],
      canGenerate: false,
      generateMeme: async () => {
        console.error("Cannot generate meme: Auth context unavailable");
        return null;
      },
      clearGeneratedMeme: () => {},
      clearHistory: () => {},
      remainingCalls: 0,
    };
  }

  const { isAuthenticated, remainingCalls, refreshUserData, backendService } =
    authContext;

  // Get toast function from context
  const { toast } = useToast();

  const generateMeme = useCallback(
    async (prompt, style = null) => {
      console.log("generateMeme called with:", {
        prompt,
        style,
        isAuthenticated,
        remainingCalls,
      });

      if (!prompt.trim()) {
        toast({
          title: "Enter a meme prompt",
          description: "Describe the meme you want to create!",
          variant: "destructive",
        });
        return null;
      }

      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please login to generate memes",
          variant: "destructive",
        });
        return null;
      }

      if (remainingCalls <= 0) {
        toast({
          title: "No Calls Remaining",
          description: "You've used all your meme generation calls for today",
          variant: "destructive",
        });
        return null;
      }

      setIsGenerating(true);

      try {
        console.log("Calling backendService.generateMeme...");
        // The backend returns the meme data directly, not wrapped in a success object
        const memeData = await backendService.generateMeme(prompt, style);
        console.log("Backend response:", memeData);

        if (memeData) {
          const normalized = normalizeMemeResponse(memeData);
          const newMeme = {
            ...normalized,
            generatedAt: new Date(),
            prompt,
            style,
          };

          setGeneratedMeme(newMeme);
          setGenerationHistory((prev) => [newMeme, ...prev]);

          toast({
            title: "Meme Generated! 🎉",
            description: `Your viral meme is ready!`,
          });

          // Refresh user data to update remaining calls
          try {
            await refreshUserData();
          } catch (refreshError) {
            console.warn("Failed to refresh user data:", refreshError);
          }

          return newMeme;
        } else {
          toast({
            title: "Generation Failed",
            description: "No meme data received from backend",
            variant: "destructive",
          });
          return null;
        }
      } catch (error) {
        console.error("Meme generation failed:", error);
        toast({
          title: "Generation Failed",
          description:
            error.message || "An error occurred while generating the meme",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [isAuthenticated, remainingCalls, refreshUserData, backendService, toast]
  );

  const clearGeneratedMeme = useCallback(() => {
    setGeneratedMeme(null);
  }, []);

  const clearHistory = useCallback(() => {
    setGenerationHistory([]);
  }, []);

  const canGenerate = isAuthenticated && remainingCalls > 0 && !isGenerating;

  console.log("useMemeGeneration state:", {
    isAuthenticated,
    remainingCalls,
    canGenerate,
    isGenerating,
  });

  return {
    isGenerating,
    generatedMeme,
    generationHistory,
    canGenerate,
    generateMeme,
    clearGeneratedMeme,
    clearHistory,
    remainingCalls,
  };
};
