import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "devis" | "intervention" | "facture";
  clientId: string;
  clientName: string;
  clientData?: {
    email?: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
  };
}

export function QuickCreateDialog({ open, onOpenChange, type, clientId, clientName, clientData }: QuickCreateDialogProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({
    titre: "",
    description: "",
    montant: "",
  });

  const handleQuickCreate = async () => {
    setLoading(true);

    try {
      if (type === "devis") {
        const { data, error } = await supabase.from("devis").insert({
          client_id: clientId,
          client_nom: clientName,
          numero: `TEMP-${Date.now()}`,
          statut: "Brouillon",
          montant: formData.montant || "0",
          title: formData.titre,
          message_client: formData.description,
          contact_email: clientData?.email,
          contact_phone: clientData?.telephone,
          billing_address: clientData?.adresse ? {
            street: clientData.adresse,
            city: clientData.ville || "",
          } : null,
          lignes: [],
        }).select().single();

        if (error) throw error;
        toast.success("Devis créé en brouillon");
        onOpenChange(false);
      } else if (type === "intervention") {
        const { data, error } = await supabase.from("jobs").insert({
          client_id: clientId,
          client_nom: clientName,
          titre: formData.titre || "Nouvelle intervention",
          description: formData.description,
          date: new Date().toISOString().split("T")[0],
          statut: "À faire",
          employe_nom: "Non assigné",
        }).select().single();

        if (error) throw error;
        toast.success("Intervention créée");
        onOpenChange(false);
      } else if (type === "facture") {
        const { data, error } = await supabase.from("factures").insert({
          client_id: clientId,
          client_nom: clientName,
          numero: `TEMP-${Date.now()}`,
          statut: "Brouillon",
          montant: formData.montant || "0",
          echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          billing_address: clientData?.adresse ? {
            street: clientData.adresse,
            city: clientData.ville || "",
          } : null,
          lignes: [],
        }).select().single();

        if (error) throw error;
        toast.success("Facture créée en brouillon");
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdvanced = () => {
    const routes: Record<string, string> = {
      devis: `/devis/new?client_id=${clientId}`,
      intervention: `/interventions/new?client_id=${clientId}`,
      facture: `/factures/new?client_id=${clientId}`,
    };
    navigate(routes[type]);
  };

  const titles: Record<string, string> = {
    devis: "Créer un devis rapide",
    intervention: "Créer une intervention rapide",
    facture: "Créer une facture rapide",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[type]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre / Objet *</Label>
            <Input
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              placeholder={type === "devis" ? "Objet du devis" : type === "intervention" ? "Titre de l'intervention" : "Objet de la facture"}
            />
          </div>

          {(type === "devis" || type === "facture") && (
            <div className="space-y-2">
              <Label>Montant estimé (€)</Label>
              <Input
                type="number"
                value={formData.montant}
                onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description rapide..."
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleQuickCreate} disabled={loading || !formData.titre}>
              {loading ? "Création..." : "Créer en brouillon"}
            </Button>
            <Button variant="outline" onClick={handleOpenAdvanced}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir en version avancée
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
