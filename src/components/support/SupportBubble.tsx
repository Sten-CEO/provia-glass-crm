import { useState } from "react";
import { MessageCircle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const CATEGORIES = [
  "Tableau de bord",
  "Clients",
  "Devis",
  "Factures",
  "Jobs/Interventions",
  "Planning",
  "Employés",
  "Timesheets",
  "Paiements",
  "Paramètres",
  "Support",
];

export const SupportBubble = () => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"categories" | "chat">("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ text: string; from: "user" | "support" }>>([
    { text: "Support Provia Base — De quoi avez-vous besoin ?", from: "support" },
  ]);
  const [input, setInput] = useState("");

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setMessages([
      ...messages,
      { text: `Je besoin d'aide avec: ${category}`, from: "user" },
      { text: `Que puis-je faire pour vous aider avec ${category} ?`, from: "support" },
    ]);
    setView("chat");
  };

  const handleHumanAssistant = () => {
    setMessages([
      ...messages,
      { text: "Je veux parler à un assistant humain", from: "user" },
      {
        text: "Expliquez votre problème, un assistant répondra sous 30 min.",
        from: "support",
      },
    ]);
    toast.success("Votre demande a été envoyée à l'équipe support");
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, from: "user" }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: "Un agent vous répondra bientôt...", from: "support" },
      ]);
    }, 500);
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[380px] h-[500px] glass-card shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-bold uppercase tracking-wide">Support Provia Base</h3>
        <Button onClick={() => setOpen(false)} variant="ghost" size="icon">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {view === "categories" ? (
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                onClick={() => handleCategoryClick(category)}
                variant="outline"
                className="w-full justify-between glass-card hover:bg-primary/10"
              >
                {category}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}
            <Button
              onClick={handleHumanAssistant}
              className="w-full bg-primary hover:bg-primary/90 mt-4"
            >
              Parler à un assistant humain
            </Button>
          </div>
        </ScrollArea>
      ) : (
        <>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.from === "user"
                      ? "bg-primary text-foreground ml-8"
                      : "glass-card mr-8"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Tapez votre message..."
                className="glass-card"
              />
              <Button onClick={handleSendMessage} size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleHumanAssistant}
              variant="link"
              className="w-full mt-2 text-xs"
            >
              Parler à un assistant humain
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};
