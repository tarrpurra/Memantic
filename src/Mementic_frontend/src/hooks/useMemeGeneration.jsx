import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "./use-toast";

export const useMemeGeneration = () => {
  const normalizeMemeResponse = (raw) => {
    if (!raw || typeof raw !== "object") return raw;

    // Handle nested data structure from worker response
    const data = raw.data || raw;

    // Prefer explicit image_url if present
    let imageUrl = data.image_url || data.url || raw.image_url || raw.url;

    // If base64 is returned, convert to data URL
    if (!imageUrl && (data.image_base64 || data.base64 || data.imageData || raw.image_base64 || raw.base64 || raw.imageData)) {
      const base64 = data.image_base64 || data.base64 || data.imageData || raw.image_base64 || raw.base64 || raw.imageData;
      imageUrl = `data:image/jpeg;base64,${base64}`;
    }

    // Additional fallback: check if raw_response contains an image URL
    if (!imageUrl && raw.raw_response) {
      const response = raw.raw_response;
      // Check for common image URL patterns
      const urlMatch = response.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        imageUrl = urlMatch[1];
      }
      // Check for data URLs
      else if (response.startsWith('data:image/')) {
        imageUrl = response;
      }
    }

    // Fallback metadata mapping
    const metadata = data.metadata || data.meta || raw.metadata || raw.meta || {};
    const imageFilename = data.image_filename || data.filename || raw.image_filename || raw.filename || undefined;

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
        // Note: Style parameter is not supported by the current backend API
        const memeData = await backendService.generateMeme(prompt);
        console.log("Backend response:", memeData);

        if (memeData) {
           console.log("Raw meme data from backend:", memeData);

           let parsedData;
           try {
             // Try to parse as JSON first
             parsedData = JSON.parse(memeData);
             console.log("Parsed JSON data:", parsedData);
           } catch (parseError) {
             console.log("Response is not valid JSON, treating as plain text");
             // If it's not JSON, try to extract image URL from various formats
             let imageUrl = null;

             // Check if it's a direct URL
             if (memeData.startsWith('http')) {
               imageUrl = memeData;
             }
             // Check if it's a data URL (base64)
             else if (memeData.startsWith('data:')) {
               imageUrl = memeData;
             }
             // Check if it's a relative path that might be an image
             else if (memeData.includes('.jpg') || memeData.includes('.png') || memeData.includes('.gif') || memeData.includes('.webp')) {
               // Try to construct a full URL
               if (memeData.startsWith('/')) {
                 imageUrl = `https://plain-night-ff62.h28177922.workers.dev${memeData}`;
               } else {
                 imageUrl = `https://plain-night-ff62.h28177922.workers.dev/${memeData}`;
               }
             }

             parsedData = {
               prompt: prompt,
               image_url: imageUrl,
               raw_response: memeData
             };
           }

           const normalized = normalizeMemeResponse(parsedData);
           const newMeme = {
             ...normalized,
             generatedAt: new Date(),
             prompt,
             style,
           };

           console.log("Final normalized meme:", newMeme);
           console.log("Image URL in final meme:", newMeme.image_url);
           console.log("Raw response:", newMeme.raw_response);
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
