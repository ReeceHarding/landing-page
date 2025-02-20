"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const CTAButton = ({ locale }: { locale: any }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setIsComplete(name.trim() !== "" && email.trim() !== "");
  }, [name, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);

    try {
      // Here you would typically make an API call to your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowSuccess(true);
      // Reset form after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setName("");
        setEmail("");
      }, 2000);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Success Message Overlay */}
      <div className={cn(
        "absolute inset-0 z-10",
        "flex items-center justify-center",
        "bg-primary/10 backdrop-blur-sm rounded-xl",
        "transition-all duration-500",
        showSuccess ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className={cn(
          "flex items-center gap-2",
          "text-white font-medium",
          "transform transition-all duration-500",
          showSuccess ? "scale-100" : "scale-95"
        )}>
          <CheckCircle className="w-6 h-6 text-primary animate-bounce" />
          <span>Welcome to the waitlist!</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className={cn(
              "w-full px-4 py-3.5 rounded-xl",
              "bg-white/5 backdrop-blur-sm",
              "border border-white/10",
              "text-white placeholder:text-white/50",
              "focus:outline-none focus:ring-2 focus:ring-primary/20",
              "transition-all duration-200"
            )}
          />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hi@example.com"
            className={cn(
              "w-full px-4 py-3.5 rounded-xl",
              "bg-white/5 backdrop-blur-sm",
              "border border-white/10",
              "text-white placeholder:text-white/50",
              "focus:outline-none focus:ring-2 focus:ring-primary/20",
              "transition-all duration-200"
            )}
          />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || showSuccess}
          className={cn(
            "w-full relative",
            isComplete ? [
              "bg-primary hover:bg-primary/90",
              "text-white",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]",
            ] : [
              "bg-primary/40 hover:bg-primary/50",
              "text-white/90",
              "shadow-none",
            ],
            "font-medium py-3.5 px-6",
            "text-[15px]",
            "rounded-xl",
            "transition-all duration-300",
            "disabled:opacity-70 disabled:cursor-not-allowed"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <Mail className={cn(
              "w-[18px] h-[18px]",
              "transition-transform duration-300",
              isComplete && "scale-110"
            )} />
            <span>{isSubmitting ? "Joining..." : locale.title}</span>
          </span>
          <div className={cn(
            "absolute inset-0 rounded-xl bg-gradient-to-r pointer-events-none transition-opacity duration-300",
            isComplete ? "from-primary-light/20 via-transparent to-transparent opacity-100" : "opacity-0"
          )} />
        </Button>
      </form>
    </div>
  );
};

export default CTAButton;
