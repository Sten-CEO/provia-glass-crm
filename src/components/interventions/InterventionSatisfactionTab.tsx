import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Save } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface InterventionSatisfactionTabProps {
  interventionId: string;
}

interface Feedback {
  rating: number;
  comment: string;
  signer_name: string;
  submitted_at: string | null;
}

export function InterventionSatisfactionTab({ interventionId }: InterventionSatisfactionTabProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [signerName, setSignerName] = useState("");
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, [interventionId]);

  const loadFeedback = async () => {
    const { data, error } = await supabase
      .from("intervention_feedback")
      .select("*")
      .eq("intervention_id", interventionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setFeedback(data);
      setRating(data.rating || 0);
      setComment(data.comment || "");
      setSignerName(data.signer_name || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }

    if (!signerName.trim()) {
      toast.error("Veuillez renseigner le nom du signataire");
      return;
    }

    setSaving(true);

    const feedbackData = {
      intervention_id: interventionId,
      rating,
      comment: comment.trim(),
      signer_name: signerName.trim(),
      submitted_at: new Date().toISOString(),
    };

    const { error } = feedback
      ? await supabase
          .from("intervention_feedback")
          .update(feedbackData)
          .eq("id", feedback.submitted_at)
      : await supabase.from("intervention_feedback").insert(feedbackData);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      setSaving(false);
      return;
    }

    // Log action
    await supabase.from("intervention_logs").insert({
      intervention_id: interventionId,
      action: "Retour client enregistré",
      details: `Note: ${rating}/5 - ${signerName}`
    });

    toast.success("Retour client enregistré");
    setSaving(false);
    loadFeedback();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Satisfaction client</CardTitle>
            {feedback && feedback.submitted_at && (
              <span className="text-sm text-muted-foreground">
                Enregistré le {format(new Date(feedback.submitted_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Note de satisfaction</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                  disabled={!!feedback?.submitted_at}
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-4 text-2xl font-semibold">{rating}/5</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nom du signataire</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Nom et prénom du client"
              disabled={!!feedback?.submitted_at}
            />
          </div>

          <div className="space-y-2">
            <Label>Commentaire du client</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaires et remarques du client..."
              rows={6}
              disabled={!!feedback?.submitted_at}
            />
          </div>

          {!feedback?.submitted_at && (
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Enregistrement..." : "Enregistrer la satisfaction client"}
            </Button>
          )}

          {feedback?.submitted_at && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Retour client enregistré avec succès
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!feedback?.submitted_at && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>⏳ En attente du retour du client</p>
            <p className="text-sm mt-2">
              Le retour sera enregistré une fois l'intervention terminée
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
