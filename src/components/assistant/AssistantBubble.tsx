import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssistantChat } from "./AssistantChat";

export const AssistantBubble = () => {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("assistant_open");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("assistant_open", String(isOpen));
  }, [isOpen]);

  return (
    <>
      {/* Bulle flottante */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50 transition-transform hover:scale-110"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Fenêtre de chat */}
      {isOpen && <AssistantChat onClose={() => setIsOpen(false)} />}
    </>
  );
};
