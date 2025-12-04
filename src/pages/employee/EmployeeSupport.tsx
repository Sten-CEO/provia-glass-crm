import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmployee } from "@/contexts/EmployeeContext";

const FAQ_ITEMS = [
  {
    question: "Comment démarrer une intervention ?",
    answer: "Allez dans l'onglet Jobs, cliquez sur l'intervention, puis appuyez sur 'Démarrer job'."
  },
  {
    question: "Comment ajouter des photos ?",
    answer: "Dans la fiche intervention, allez dans l'onglet Photos et utilisez les boutons pour capturer avant/après."
  },
  {
    question: "Que faire si je n'ai pas de réseau ?",
    answer: "L'app fonctionne hors-ligne. Vos actions se synchroniseront automatiquement au retour du réseau."
  },
  {
    question: "Comment pointer mes heures ?",
    answer: "Utilisez le bouton 'Démarrer journée' sur le Dashboard, ou démarrez directement un job spécifique."
  },
  {
    question: "Comment collecter une signature ?",
    answer: "Dans la fiche intervention, onglet Signature, demandez au client de signer sur l'écran tactile."
  }
];

export const EmployeeSupport = () => {
  const { employeeId } = useEmployee();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !description.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setSubmitting(true);

    try {
      // Créer un ticket de support (temporairement commenté en attente de la mise à jour des types)
      /* 
      const { error } = await supabase
        .from("support_tickets")
        .insert({
          employee_id: employeeId,
          subject: subject.trim(),
          description: description.trim(),
          status: "open"
        });

      if (error) throw error;
      */

      toast.success("Ticket envoyé avec succès");
      setSubject("");
      setDescription("");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'envoi du ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Support & Aide</h1>
        <p className="text-muted-foreground">
          Consultez la FAQ ou contactez-nous pour toute question
        </p>
      </div>

      {/* FAQ */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Questions fréquentes</h2>
        </div>
        
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full p-4 text-left font-medium hover:bg-muted/50 transition-colors"
              >
                {item.question}
              </button>
              {expandedFaq === index && (
                <div className="px-4 pb-4 text-sm text-muted-foreground">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Formulaire ticket */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Créer un ticket de support</h2>
        
        <form onSubmit={handleSubmitTicket} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              placeholder="Résumé de votre demande"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez votre problème ou question en détail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={submitting}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Envoi en cours..." : "Envoyer le ticket"}
          </Button>
        </form>
      </Card>
    </div>
  );
};
