import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileDown, Save } from "lucide-react";

interface InterventionReportTabProps {
  job: any;
  onUpdate: () => void;
}

interface ReportData {
  title: string;
  actions_performed: string;
  issues_encountered: string;
  recommendations: string;
  work_completed: boolean;
  photos_taken: boolean;
  signature_obtained: boolean;
}

export function InterventionReportTab({ job, onUpdate }: InterventionReportTabProps) {
  const [reportData, setReportData] = useState<ReportData>({
    title: `Rapport d'intervention - ${job.titre}`,
    actions_performed: "",
    issues_encountered: "",
    recommendations: "",
    work_completed: false,
    photos_taken: false,
    signature_obtained: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load existing report data from job
    if (job.client_notes) {
      try {
        const parsed = JSON.parse(job.client_notes);
        if (parsed.report) {
          setReportData({ ...reportData, ...parsed.report });
        }
      } catch {
        // If not JSON, use as actions_performed
        setReportData({ ...reportData, actions_performed: job.client_notes });
      }
    }
  }, [job.id]);

  const handleSave = async () => {
    setSaving(true);
    
    // Save report data in client_notes as JSON
    const { error } = await supabase
      .from("jobs")
      .update({ 
        client_notes: JSON.stringify({ report: reportData })
      })
      .eq("id", job.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      setSaving(false);
      return;
    }

    // Log action
    await supabase.from("intervention_logs").insert({
      intervention_id: job.id,
      action: "Rapport mis à jour",
      details: "Le rapport d'intervention a été modifié"
    });

    toast.success("Rapport sauvegardé");
    setSaving(false);
    onUpdate();
  };

  const handleGeneratePDF = () => {
    toast.info("Génération du PDF en cours...");
    // TODO: Implement PDF generation
    toast.info("Fonctionnalité PDF à venir");
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rapport d'intervention</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
              <Button onClick={handleGeneratePDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Générer PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Titre du rapport</Label>
            <Input
              value={reportData.title}
              onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
              placeholder="Titre du rapport"
            />
          </div>

          <div className="space-y-2">
            <Label>Actions effectuées</Label>
            <Textarea
              value={reportData.actions_performed}
              onChange={(e) => setReportData({ ...reportData, actions_performed: e.target.value })}
              placeholder="Décrivez les actions réalisées pendant l'intervention..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label>Problèmes rencontrés</Label>
            <Textarea
              value={reportData.issues_encountered}
              onChange={(e) => setReportData({ ...reportData, issues_encountered: e.target.value })}
              placeholder="Décrivez les éventuels problèmes ou difficultés..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Recommandations</Label>
            <Textarea
              value={reportData.recommendations}
              onChange={(e) => setReportData({ ...reportData, recommendations: e.target.value })}
              placeholder="Recommandations pour le client ou interventions futures..."
              rows={4}
            />
          </div>

          <div className="space-y-3">
            <Label>Vérifications</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="work_completed"
                  checked={reportData.work_completed}
                  onCheckedChange={(checked) => 
                    setReportData({ ...reportData, work_completed: checked as boolean })
                  }
                />
                <label
                  htmlFor="work_completed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Travaux terminés
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="photos_taken"
                  checked={reportData.photos_taken}
                  onCheckedChange={(checked) => 
                    setReportData({ ...reportData, photos_taken: checked as boolean })
                  }
                />
                <label
                  htmlFor="photos_taken"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Photos prises
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="signature_obtained"
                  checked={reportData.signature_obtained}
                  onCheckedChange={(checked) => 
                    setReportData({ ...reportData, signature_obtained: checked as boolean })
                  }
                />
                <label
                  htmlFor="signature_obtained"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Signature obtenue
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature section */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Signature client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du signataire</Label>
            <Input 
              value={job.signature_name || ""} 
              readOnly
              placeholder="Pas encore de signature"
            />
          </div>

          {job.signature_date && (
            <div className="space-y-2">
              <Label>Date de signature</Label>
              <Input 
                type="text"
                value={new Date(job.signature_date).toLocaleString("fr-FR")} 
                readOnly
              />
            </div>
          )}

          {job.signature_image ? (
            <div className="space-y-2">
              <Label>Signature</Label>
              <div className="border rounded-lg p-4 bg-background">
                <img src={job.signature_image} alt="Signature" className="max-h-32 mx-auto" />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <p>⚠️ Signature disponible via l'application mobile Provia BASE</p>
              <p className="text-sm mt-2">(bientôt disponible)</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
