import { useState, useRef } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Textarea } from "../components/ui/Textarea";
import { Input } from "../components/ui/Input";
import { useNavigate } from "react-router";
import {
  Upload,
  User,
  Sparkles,
  Image,
  ArrowLeft,
  Send,
} from "../components/ui/Icon";
import { useToast } from "../hooks/use-toast";
import { BackendTest } from "../components/BackendTest";

const MyPlace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [prompt, setPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [generatedMeme, setGeneratedMeme] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  const templates = [
    { id: 0, name: "Drake Pointing", emoji: "👉" },
    { id: 1, name: "Distracted Boyfriend", emoji: "😍" },
    { id: 2, name: "Woman Yelling at Cat", emoji: "😾" },
    { id: 3, name: "This is Fine", emoji: "🔥" },
    { id: 4, name: "Expanding Brain", emoji: "🧠" },
    { id: 5, name: "Change My Mind", emoji: "💭" },
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImage(e.target.result);
        };
        reader.readAsDataURL(file);
        toast({
          title: "Image Uploaded! 📷",
          description: "Your custom image is ready to use.",
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file (PNG, JPG, GIF, etc.).",
          variant: "destructive",
        });
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Missing Prompt",
        description: "Please enter a prompt to generate your meme.",
        variant: "destructive",
      });
      return;
    }

    setGeneratedMeme(true);
    toast({
      title: "Meme Generated! 🎉",
      description: "Your viral content is ready to share with the world.",
    });
  };

  const handlePostToMarketplace = () => {
    toast({
      title: "Posted to Marketplace! 🚀",
      description: "Your meme is now live and ready for votes.",
    });
    navigate("/marketplace");
  };

  const handleTagClick = (tag) => {
    const tagText = `#${tag.toLowerCase()} `;
    if (!prompt.includes(tagText)) {
      setPrompt(prev => prev + tagText);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/marketplace")}
              aria-label="Go back to marketplace"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">My Creative Space</h1>
              <p className="text-sm text-muted-foreground">
                AI-Powered Meme Generation
              </p>
            </div>
          </div>
          <div
            className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={() => navigate("/portfolio")}
          >
            <User className="w-4 h-4 mr-2 inline" />
            Portfolio
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Creation Panel */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Choose Your Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Upload Option */}
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center mb-6 hover:border-primary transition-colors cursor-pointer"
                  onClick={handleUploadClick}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploadedImage ? "Change uploaded image" : "Upload your own image or drag & drop"}
                  </p>
                  {uploadedImage && (
                    <div className="mt-2 text-xs text-primary">
                      ✓ Custom image uploaded
                    </div>
                  )}
                  <Input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Template Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="text-xl text-center mb-2">
                        {template.emoji}
                      </div>
                      <p className="text-xs text-center font-medium">
                        {template.name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe your meme idea... (e.g., 'A cat explaining crypto to confused humans')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    "Funny",
                    "Crypto",
                    "Relatable",
                    "Trending",
                    "Sarcastic",
                  ].map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => handleTagClick(tag)}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Meme with AI
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedMeme ? (
                  <div className="space-y-4">
                    <div className="aspect-square bg-gradient-glow rounded-lg p-8 flex items-center justify-center">
                      <div className="text-center w-full">
                        {uploadedImage ? (
                          <div className="relative w-full h-32 mb-4 bg-cover bg-center rounded-lg" style={{backgroundImage: `url(${uploadedImage})`}}>
                            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                              <div className="bg-background/90 p-2 rounded">
                                <p className="font-bold text-sm">{prompt}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center text-3xl">
                              {templates[selectedTemplate].emoji}
                            </div>
                            <div className="bg-background/90 p-4 rounded-lg">
                              <p className="font-bold text-lg">{prompt}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        variant="hero"
                        size="lg"
                        className="w-full"
                        onClick={handlePostToMarketplace}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Post to Marketplace
                      </Button>
                      <Button variant="outline" size="lg" className="w-full">
                        Save as Draft
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-muted/20 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Sparkles className="w-12 h-12 mx-auto mb-4" />
                      <p>Your generated meme will appear here</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <p>Be specific with your prompts for better results</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <p>Use trending topics for viral potential</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <p>Keep text short and punchy</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <p>Check spelling before posting</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Backend Integration Test */}
        <div className="mt-8">
          <BackendTest />
        </div>
      </div>
    </div>
  );
};

export default MyPlace;