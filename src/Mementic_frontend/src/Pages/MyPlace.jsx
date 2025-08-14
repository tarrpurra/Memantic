import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { useNavigate } from "react-router";
import { Upload, Sparkles, Image, ArrowLeft, Send } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const MyPlace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [generatedMeme, setGeneratedMeme] = useState(false);

  const templates = [
    { id: 0, name: "Drake Pointing", emoji: "👉" },
    { id: 1, name: "Distracted Boyfriend", emoji: "😍" },
    { id: 2, name: "Woman Yelling at Cat", emoji: "😾" },
    { id: 3, name: "This is Fine", emoji: "🔥" },
    { id: 4, name: "Expanding Brain", emoji: "🧠" },
    { id: 5, name: "Change My Mind", emoji: "💭" },
  ];

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">My Creative Space</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Meme Generation</p>
            </div>
          </div>
          <Badge variant="secondary">
            <Sparkles className="w-4 h-4 mr-2" />
            Creator Mode
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Creation Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Choose Your Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Upload Option */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mb-6 hover:border-primary transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Upload your own image or drag & drop
                  </p>
                  <Input type="file" className="hidden" />
                </div>

                {/* Template Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="text-2xl text-center mb-2">{template.emoji}</div>
                      <p className="text-xs text-center">{template.name}</p>
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
                  {["Funny", "Crypto", "Relatable", "Trending", "Sarcastic"].map((tag) => (
                    <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-primary/10">
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedMeme ? (
                  <div className="space-y-4">
                    <div className="aspect-square bg-gradient-glow rounded-lg p-8 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-4">{templates[selectedTemplate].emoji}</div>
                        <div className="bg-background/90 p-4 rounded-lg">
                          <p className="font-bold text-lg">{prompt}</p>
                        </div>
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
                <CardTitle className="text-lg">💡 Pro Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Be specific with your prompts for better results</p>
                <p>• Use trending topics for viral potential</p>
                <p>• Keep text short and punchy</p>
                <p>• Check spelling before posting</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPlace;