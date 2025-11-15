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
  const [humanAssistantActive, setHumanAssistantActive] = useState(false);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setMessages([
      ...messages,
      { text: `J'ai besoin d'aide avec: ${category}`, from: "user" },
    ]);
    setView("chat");
    
    // Show quick sub-options based on category
    setTimeout(() => {
      const subOptions = getSubOptions(category);
      setMessages((prev) => [
        ...prev,
        { text: subOptions, from: "support" },
      ]);
    }, 300);
  };

  const getSubOptions = (category: string) => {
    const options: Record<string, string> = {
      "Tableau de bord": "1. Module revenus\n2. Widgets\n3. Activité récente",
      "Clients": "1. Ajouter un client\n2. Voir l'historique\n3. Export CSV",
      "Devis": "1. Créer un devis\n2. Envoyer par email\n3. Convertir en facture",
      "Factures": "1. Créer une facture\n2. Marquer payée\n3. Télécharger PDF",
      "Jobs/Interventions": "1. Créer un job\n2. Assigner un employé\n3. Voir le calendrier",
      "Planning": "1. Vue calendrier\n2. Déplacer un job\n3. Filtres",
      "Employés": "1. Inviter un employé\n2. Gérer les accès\n3. Compétences",
      "Timesheets": "1. Enregistrer une feuille de temps\n2. Voir l'historique",
      "Paiements": "1. Enregistrer un paiement\n2. Voir les transactions",
      "Paramètres": "1. Mon entreprise\n2. Facturation\n3. Préférences",
      "Support": "Quel est votre problème ? Décrivez-le brièvement.",
    };
    return options[category] || "Comment puis-je vous aider ?";
  };

  const handleHumanAssistant = () => {
    if (humanAssistantActive) return;
    
    setHumanAssistantActive(true);
    setMessages([
      ...messages,
      { text: "Je veux parler à un assistant humain", from: "user" },
      {
        text: "Expliquez brièvement votre problème. Un assistant vous répondra sous 30 min.",
        from: "support",
      },
    ]);
    toast.success("Votre demande a été envoyée à l'équipe support");
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, from: "user" }]);
    setInput("");
    
    if (!humanAssistantActive) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { text: "Merci pour votre message. Un agent vous répondra bientôt...", from: "support" },
        ]);
      }, 500);
    }
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
    <Card className="fixed bottom-6 right-6 w-[420px] h-[550px] glass-card shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-bold uppercase tracking-wide text-sm">Support Provia Base</h3>
        <Button onClick={() => setOpen(false)} variant="ghost" size="icon">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {view === "categories" ? (
        <ScrollArea className="flex-1 p-4">
          <p className="text-sm text-muted-foreground mb-4">Sélectionnez un thème:</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                onClick={() => handleCategoryClick(category)}
                variant="outline"
                size="sm"
                className="glass-card hover:bg-primary/20 text-xs"
              >
                {category}
              </Button>
            ))}
          </div>
          <Button
            onClick={handleHumanAssistant}
            className="w-full bg-primary hover:bg-primary/90 mt-6"
          >
            Parler à un assistant humain
          </Button>
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
