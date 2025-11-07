import { useState } from "react";
import { X, Edit, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobDetailPanelProps {
  jobId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export const JobDetailPanel = ({ jobId, onClose, onUpdate }: JobDetailPanelProps) => {
  const [job, setJob] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useState(() => {
    loadJob();
    loadClients();
    loadEmployees();
  });

  const loadJob = async () => {
    const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    setJob(data);
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("id, nom");
    setClients(data || []);
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from("equipe").select("id, nom");
    setEmployees(data || []);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("jobs")
      .update({
        titre: job.titre,
        client_id: job.client_id,
        employe_id: job.employe_id,
        adresse: job.adresse,
        date: job.date,
        heure_debut: job.heure_debut,
        heure_fin: job.heure_fin,
        type: job.type,
        zone: job.zone,
        statut: job.statut,
      })
      .eq("id", jobId);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      return;
    }

    toast.success("Job modifié avec succès");
    setIsEditing(false);
    onUpdate();
  };

  const handleDuplicate = async () => {
    const { error } = await supabase.from("jobs").insert([
      {
        titre: `${job.titre} (copie)`,
        client_id: job.client_id,
        client_nom: job.client_nom,
        employe_id: job.employe_id,
        employe_nom: job.employe_nom,
        adresse: job.adresse,
        date: job.date,
        heure_debut: job.heure_debut,
        heure_fin: job.heure_fin,
        type: job.type,
        zone: job.zone,
        statut: "À faire",
      },
    ]);

    if (error) {
      toast.error("Erreur lors de la duplication");
      return;
    }

    toast.success("Job dupliqué avec succès");
    onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    toast.success("Job supprimé avec succès");
    onUpdate();
    onClose();
  };

  if (!job) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] glass-card shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-bold uppercase tracking-wide">Détails du Job</h3>
        <Button onClick={onClose} variant="ghost" size="icon">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <Label>Titre</Label>
          <Input
            value={job.titre}
            onChange={(e) => setJob({ ...job, titre: e.target.value })}
            disabled={!isEditing}
            className="glass-card"
          />
        </div>

        <div>
          <Label>Client</Label>
          <Select
            value={job.client_id}
            onValueChange={(v) => {
              const client = clients.find((c) => c.id === v);
              setJob({ ...job, client_id: v, client_nom: client?.nom });
            }}
            disabled={!isEditing}
          >
            <SelectTrigger className="glass-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Employé</Label>
          <Select
            value={job.employe_id}
            onValueChange={(v) => {
              const emp = employees.find((e) => e.id === v);
              setJob({ ...job, employe_id: v, employe_nom: emp?.nom });
            }}
            disabled={!isEditing}
          >
            <SelectTrigger className="glass-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Adresse</Label>
          <Input
            value={job.adresse || ""}
            onChange={(e) => setJob({ ...job, adresse: e.target.value })}
            disabled={!isEditing}
            className="glass-card"
          />
        </div>

        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={job.date}
            onChange={(e) => setJob({ ...job, date: e.target.value })}
            disabled={!isEditing}
            className="glass-card"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Heure début</Label>
            <Input
              type="time"
              value={job.heure_debut || "09:00"}
              onChange={(e) => setJob({ ...job, heure_debut: e.target.value })}
              disabled={!isEditing}
              className="glass-card"
            />
          </div>
          <div>
            <Label>Heure fin</Label>
            <Input
              type="time"
              value={job.heure_fin || "17:00"}
              onChange={(e) => setJob({ ...job, heure_fin: e.target.value })}
              disabled={!isEditing}
              className="glass-card"
            />
          </div>
        </div>

        <div>
          <Label>Type</Label>
          <Input
            value={job.type || ""}
            onChange={(e) => setJob({ ...job, type: e.target.value })}
            disabled={!isEditing}
            className="glass-card"
            placeholder="Installation, Maintenance..."
          />
        </div>

        <div>
          <Label>Zone</Label>
          <Input
            value={job.zone || ""}
            onChange={(e) => setJob({ ...job, zone: e.target.value })}
            disabled={!isEditing}
            className="glass-card"
            placeholder="Paris, Lyon..."
          />
        </div>

        <div>
          <Label>Statut</Label>
          <Select value={job.statut} onValueChange={(v) => setJob({ ...job, statut: v })} disabled={!isEditing}>
            <SelectTrigger className="glass-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="À faire">À faire</SelectItem>
              <SelectItem value="En cours">En cours</SelectItem>
              <SelectItem value="Terminé">Terminé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-4">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="flex-1 bg-primary hover:bg-primary/90">
                Enregistrer
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                Annuler
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} className="flex-1" variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button onClick={handleDuplicate} className="flex-1" variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </Button>
              <Button onClick={handleDelete} variant="destructive" className="flex-1">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
