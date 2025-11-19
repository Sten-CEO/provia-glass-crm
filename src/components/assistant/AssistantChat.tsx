import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  text: string;
  from: "user" | "assistant";
  timestamp: Date;
}

const CATEGORIES = [
  "Tableau de bord",
  "Clients",
  "Devis",
  "Factures",
  "Interventions",
  "Planning",
  "Inventaire",
  "Équipe",
  "Paramètres",
];

const getResponseForCategory = (category: string): string => {
  const responses: Record<string, string> = {
    "Tableau de bord": "Le tableau de bord vous donne un aperçu de votre activité : revenus, alertes, agenda. Que souhaitez-vous consulter ?",
    "Clients": "Dans la section Clients, vous pouvez gérer vos contacts, adresses, historique. Besoin d'aide pour ajouter ou modifier un client ?",
    "Devis": "Les devis vous permettent de créer des propositions commerciales. Je peux vous aider à créer, envoyer ou convertir un devis en facture.",
    "Factures": "Gérez vos factures ici : création, envoi, suivi des paiements. Comment puis-je vous assister ?",
    "Interventions": "Les interventions (jobs) regroupent les missions terrain. Je peux vous aider avec la planification, l'affectation, ou le suivi.",
    "Planning": "Le planning affiche vos interventions et rendez-vous. Besoin d'aide pour planifier ou déplacer un job ?",
    "Inventaire": "L'inventaire gère vos stocks de consommables et matériels. Que voulez-vous faire : ajouter, réserver, ou consulter ?",
    "Équipe": "Dans Équipe, gérez vos collaborateurs, leurs accès et compétences. Comment puis-je vous aider ?",
    "Paramètres": "Les paramètres permettent de configurer votre entreprise, modèles, taxes, catalogues. Que souhaitez-vous modifier ?",
  };
  return responses[category] || "Comment puis-je vous aider avec cette section ?";
};

export const AssistantChat = ({ onClose }: { onClose: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Bonjour 👋, comment puis-je vous aider aujourd'hui ?",
      from: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      from: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowCategories(false);

    // Réponse automatique
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Je prends note de votre demande. Un membre de l'équipe vous répondra rapidement. En attendant, n'hésitez pas à explorer les catégories ci-dessus pour une aide immédiate.",
        from: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 800);
  };

  const handleCategoryClick = (category: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `J'ai besoin d'aide avec : ${category}`,
      from: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setShowCategories(false);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getResponseForCategory(category),
        from: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  };

  return (
    <Card className="fixed bottom-24 right-6 w-[420px] h-[600px] glass-card shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Assistant Provia Base</h3>
        <Button onClick={onClose} variant="ghost" size="icon">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.from === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Catégories */}
        {showCategories && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">Sélectionnez un thème :</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Tapez votre message..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
