import { useState, useRef, useEffect } from "react";
import { X, Send, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAssistantConversations } from "@/hooks/useAssistantConversations";
import { ConversationTab } from "./ConversationTab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const {
    conversations,
    activeConversationId,
    messages,
    loading,
    createConversation,
    sendMessage,
    closeConversation,
    switchConversation
  } = useAssistantConversations();

  const [input, setInput] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [conversationToClose, setConversationToClose] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const isConversationClosed = activeConversation?.status === "closed";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Hide categories once messages exist
  useEffect(() => {
    if (messages.length > 0) {
      setShowCategories(false);
    } else {
      setShowCategories(true);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const messageContent = input;
    setInput("");

    if (!activeConversationId) {
      // Create new conversation with first message
      const newConvId = await createConversation(messageContent);
      if (newConvId) {
        // Send automatic assistant response
        setTimeout(async () => {
          await sendMessage(
            newConvId,
            "Je prends note de votre demande. Un membre de l'équipe vous répondra rapidement. En attendant, n'hésitez pas à explorer les catégories ci-dessus pour une aide immédiate.",
            "assistant"
          );
        }, 800);
      }
    } else {
      // Add message to existing conversation
      await sendMessage(activeConversationId, messageContent, "user");
      
      // Send automatic assistant response
      setTimeout(async () => {
        await sendMessage(
          activeConversationId,
          "Je prends note de votre demande. Un membre de l'équipe vous répondra rapidement.",
          "assistant"
        );
      }, 800);
    }
  };

  const handleCategoryClick = async (category: string) => {
    const messageContent = `J'ai besoin d'aide avec : ${category}`;

    if (!activeConversationId) {
      // Create new conversation
      const newConvId = await createConversation(messageContent);
      if (newConvId) {
        setTimeout(async () => {
          await sendMessage(newConvId, getResponseForCategory(category), "assistant");
        }, 500);
      }
    } else {
      await sendMessage(activeConversationId, messageContent, "user");
      setTimeout(async () => {
        await sendMessage(activeConversationId, getResponseForCategory(category), "assistant");
      }, 500);
    }
  };

  const handleCloseConversation = (convId: string) => {
    setConversationToClose(convId);
    setCloseDialogOpen(true);
  };

  const confirmCloseConversation = async () => {
    if (conversationToClose) {
      await closeConversation(conversationToClose);
      setConversationToClose(null);
    }
    setCloseDialogOpen(false);
  };

  const handleNewConversation = () => {
    // Clear active conversation to start fresh
    localStorage.removeItem("assistant_active_conversation");
    window.location.reload();
  };

  return (
    <>
      <Card className="fixed bottom-24 right-6 w-[700px] h-[600px] glass-card shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Assistant Provia Base</h3>
            {activeConversation && (
              <Badge variant={activeConversation.status === "open" ? "default" : "secondary"}>
                {activeConversation.status === "open" ? "Ouvert" : "Clôturé"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleNewConversation} variant="ghost" size="sm">
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Conversations list */}
          {conversations.length > 0 && (
            <div className="w-48 border-r border-border overflow-y-auto">
              <div className="p-2 space-y-1">
                {conversations.map((conv) => (
                  <ConversationTab
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    onClick={() => switchConversation(conv.id)}
                    onClose={() => handleCloseConversation(conv.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 flex flex-col min-w-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <p className="text-muted-foreground text-center">
                    Bonjour 👋, comment puis-je vous aider aujourd'hui ?
                  </p>
                  {showCategories && (
                    <div className="w-full space-y-2">
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
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {showCategories && messages.length > 0 && (
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
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
              {isConversationClosed ? (
                <div className="text-center text-muted-foreground text-sm py-2">
                  Conversation clôturée
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clôturer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action clôturera définitivement cette conversation. Vous ne pourrez plus ajouter de messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseConversation}>Clôturer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
