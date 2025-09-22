import { useState } from "react";
import { Button } from "./ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/Card";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { MessageSquare, Send, CheckCircle, ExternalLink } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useNavigate } from "react-router-dom";
import backendService from "../services/backendService";

export const FeedbackForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    likes: "",
    dislikes: "",
    suggestions: "",
    willReturn: null,
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (formData.willReturn === null) {
      toast({
        title: "Please Answer",
        description: "Please let us know if you'll come back to the website",
        variant: "destructive",
      });
      return;
    }

    if (!formData.likes.trim() && !formData.dislikes.trim() && !formData.suggestions.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please share at least one thing you like, don't like, or suggest",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Submitting feedback to backend:", {
        name: formData.name,
        likes: formData.likes,
        dislikes: formData.dislikes,
        suggestions: formData.suggestions,
        willReturn: formData.willReturn
      });

      const result = await backendService.submitFeedback(
        formData.name,
        formData.likes,
        formData.dislikes,
        formData.suggestions,
        formData.willReturn
      );

      console.log("Feedback submitted successfully:", result);

      // Trigger landing page refresh
      localStorage.setItem('feedbackSubmitted', Date.now().toString());

      setIsSubmitted(true);
      toast({
        title: "Thank You! 🎉",
        description: "Your feedback has been stored and will appear on our landing page",
      });

      // Reset form
      setFormData({
        name: "",
        likes: "",
        dislikes: "",
        suggestions: "",
        willReturn: null,
      });

    } catch (error) {
      console.error("Feedback submission failed:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h3 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
            Thank You for Your Feedback!
          </h3>
          <p className="text-green-600 dark:text-green-400 mb-6">
            Your feedback has been stored and will help us improve Mementic. Check out the landing page to see your review displayed with others!
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => navigate("/")}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Landing Page
            </Button>
            <Button
              onClick={() => setIsSubmitted(false)}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              Submit Another Response
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <MessageSquare className="w-6 h-6 text-primary" />
          Share Your Feedback
        </CardTitle>
        <p className="text-muted-foreground">
          Help us improve Mementic! Your honest feedback is valuable to us.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Name *
            </label>
            <Input
              type="text"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full"
              maxLength={100}
            />
          </div>

          {/* What they like */}
          <div>
            <label className="block text-sm font-medium mb-2">
              What do you like about the website?
            </label>
            <Textarea
              placeholder="Tell us what you enjoy about Mementic..."
              value={formData.likes}
              onChange={(e) => handleInputChange("likes", e.target.value)}
              className="w-full min-h-[80px]"
              maxLength={500}
            />
          </div>

          {/* What they don't like */}
          <div>
            <label className="block text-sm font-medium mb-2">
              What don't you like or what could be improved?
            </label>
            <Textarea
              placeholder="Share any issues or areas for improvement..."
              value={formData.dislikes}
              onChange={(e) => handleInputChange("dislikes", e.target.value)}
              className="w-full min-h-[80px]"
              maxLength={500}
            />
          </div>

          {/* Suggestions */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Any suggestions or new features you'd like to see?
            </label>
            <Textarea
              placeholder="Share your ideas for making Mementic better..."
              value={formData.suggestions}
              onChange={(e) => handleInputChange("suggestions", e.target.value)}
              className="w-full min-h-[80px]"
              maxLength={500}
            />
          </div>

          {/* Will return question */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Will you come back to Mementic again? *
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="willReturn"
                  value="yes"
                  checked={formData.willReturn === true}
                  onChange={() => handleInputChange("willReturn", true)}
                  className="w-4 h-4 text-primary"
                />
                <span>Yes, definitely</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="willReturn"
                  value="no"
                  checked={formData.willReturn === false}
                  onChange={() => handleInputChange("willReturn", false)}
                  className="w-4 h-4 text-primary"
                />
                <span>No, probably not</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};