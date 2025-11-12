import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, CheckCircle, Camera, FileSignature } from "lucide-react";
import { toast } from "sonner";

export const EmployeeInterventionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intervention, setIntervention] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadIntervention();
  }, [id]);

  const loadIntervention = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setIntervention(data);
      setNotes(data.notes || "");
    } catch (error: any) {
      toast.error("Erreur de chargement");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const updates: any = { statut: newStatus };
      
      if (newStatus === "En cours") {
        updates.started_at = new Date().toISOString();
      } else if (newStatus === "Terminée") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`Intervention ${newStatus.toLowerCase()}`);
      loadIntervention();
    } catch (error: any) {
      toast.error("Erreur de mise à jour");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ notes })
        .eq("id", id);

      if (error) throw error;
      toast.success("Notes enregistrées");
    } catch (error: any) {
      toast.error("Erreur d'enregistrement");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <Card className="p-8 text-center text-muted-foreground">
          Intervention introuvable
        </Card>
      </div>
    );
  }

  const canStart = intervention.statut === "À faire";
  const canPause = intervention.statut === "En cours";
  const canComplete = intervention.statut === "En cours";

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{intervention.titre}</h2>
            <p className="text-muted-foreground">{intervention.client_nom}</p>
          </div>
          <Badge>{intervention.statut}</Badge>
        </div>

        {intervention.adresse && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">Adresse</p>
            <p className="text-sm text-muted-foreground">{intervention.adresse}</p>
          </div>
        )}

        {intervention.description && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-1">Description</p>
            <p className="text-sm text-muted-foreground">{intervention.description}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {canStart && (
            <Button
              onClick={() => updateStatus("En cours")}
              disabled={updating}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Démarrer
            </Button>
          )}

          {canPause && (
            <Button
              onClick={() => updateStatus("À faire")}
              disabled={updating}
              variant="outline"
              className="flex-1"
            >
              <Pause className="h-4 w-4 mr-2" />
              Mettre en pause
            </Button>
          )}

          {canComplete && (
            <Button
              onClick={() => updateStatus("Terminée")}
              disabled={updating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Terminer
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Notes d'intervention</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ajoutez vos observations..."
          className="mb-3 min-h-32"
        />
        <Button onClick={saveNotes} disabled={updating} className="w-full">
          Enregistrer les notes
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Actions</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Camera className="h-4 w-4 mr-2" />
            Prendre des photos
            <Badge variant="secondary" className="ml-auto">Bientôt</Badge>
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <FileSignature className="h-4 w-4 mr-2" />
            Signature client
            <Badge variant="secondary" className="ml-auto">Bientôt</Badge>
          </Button>
        </div>
      </Card>
    </div>
  );
};
