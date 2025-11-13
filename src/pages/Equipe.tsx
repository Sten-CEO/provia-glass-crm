import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateEmployeeAccessDialog } from "@/components/equipe/CreateEmployeeAccessDialog";

interface TeamMember {
  id: string;
  nom: string;
  role: "Owner" | "Admin" | "Employé terrain";
  email: string;
  competences: string[];
  note: string | null;
  user_id?: string | null;
  status?: string | null;
  phone?: string | null;
  app_access_status?: 'none' | 'active' | 'suspended';
  access_controls: {
    devis?: boolean;
    planning?: boolean;
    factures?: boolean;
    clients?: boolean;
    jobs?: boolean;
    timesheets?: boolean;
    paiements?: boolean;
    parametres?: boolean;
  };
}

const Equipe = () => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState({
    nom: "",
    role: "Employé terrain" as const,
    email: "",
    competences: [] as string[],
    note: "",
    access_controls: {
      devis: true,
      planning: true,
      factures: true,
      clients: true,
      jobs: true,
      timesheets: true,
      paiements: true,
      parametres: false,
    },
  });

  const loadTeam = async () => {
    const { data, error } = await supabase
      .from("equipe")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setTeam((data || []) as TeamMember[]);
  };

  useEffect(() => {
    loadTeam();

    const channel = supabase
      .channel("equipe-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "equipe" }, () => {
        loadTeam();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddMember = async () => {
    if (!newMember.nom || !newMember.email) {
      toast.error("Nom et email requis");
      return;
    }

    const { error} = await supabase.from("equipe").insert([
      {
        nom: newMember.nom,
        role: newMember.role,
        email: newMember.email,
        competences: newMember.competences,
        note: newMember.note,
        access_controls: newMember.access_controls,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Membre invité avec succès");
    setNewMember({
      nom: "",
      role: "Employé terrain",
      email: "",
      competences: [],
      note: "",
      access_controls: {
        devis: true,
        planning: true,
        factures: true,
        clients: true,
        jobs: true,
        timesheets: true,
        paiements: true,
        parametres: false,
      },
    });
    setOpen(false);
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;

    const { error } = await supabase
      .from("equipe")
      .update({
        nom: selectedMember.nom,
        role: selectedMember.role,
        email: selectedMember.email,
        competences: selectedMember.competences,
        note: selectedMember.note,
        access_controls: selectedMember.access_controls,
      })
      .eq("id", selectedMember.id);

    if (error) {
      toast.error("Échec de modification");
      return;
    }

    toast.success("Membre modifié avec succès");
    setEditOpen(false);
    setSelectedMember(null);
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    const { error } = await supabase.from("equipe").delete().eq("id", selectedMember.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Membre supprimé avec succès");
    setDeleteOpen(false);
    setSelectedMember(null);
  };

  const getRoleColor = (role: TeamMember["role"]) => {
    switch (role) {
      case "Owner":
        return "bg-primary/20 text-foreground";
      case "Admin":
        return "bg-secondary/20 text-foreground";
      case "Employé terrain":
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Équipe</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              Inviter un membre
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Inviter un membre</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  placeholder="Jean Dupont"
                  value={newMember.nom}
                  onChange={(e) => setNewMember({ ...newMember, nom: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="jean@entreprise.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Rôle</Label>
                <Select value={newMember.role} onValueChange={(v: any) => setNewMember({ ...newMember, role: v })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Membre">Membre</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Compétences</Label>
                <Input
                  placeholder="Séparées par des virgules"
                  value={newMember.competences.join(", ")}
                  onChange={(e) => setNewMember({ ...newMember, competences: e.target.value.split(",").map((s) => s.trim()) })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Note</Label>
                <Input
                  placeholder="Note interne..."
                  value={newMember.note}
                  onChange={(e) => setNewMember({ ...newMember, note: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label className="mb-2 block">Accès UI (restrictions UI uniquement)</Label>
                <div className="space-y-2 glass-card p-4 rounded-lg">
                  {Object.entries(newMember.access_controls).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          setNewMember({
                            ...newMember,
                            access_controls: { ...newMember.access_controls, [key]: e.target.checked },
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="capitalize text-sm">{key}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={handleAddMember} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
                Inviter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Nom</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Rôle</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Email</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Accès App</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">
                    <button 
                      onClick={() => window.location.href = `/equipe/${member.id}`}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      {member.nom}
                    </button>
                  </td>
                  <td className="p-4">
                    <Badge className={getRoleColor(member.role)}>{member.role}</Badge>
                  </td>
                  <td className="p-4 text-muted-foreground">{member.email}</td>
                  <td className="p-4">
                    {member.user_id ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        <Smartphone className="h-3 w-3 mr-1" />
                        {member.app_access_status === 'suspended' ? 'Suspendu' : 'Actif'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Aucun
                      </Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {!member.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary"
                          onClick={() => {
                            setSelectedEmployee(member);
                            setAccessDialogOpen(true);
                          }}
                        >
                          <Smartphone className="h-4 w-4 mr-1" />
                          Créer accès
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">Modifier Membre</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={selectedMember.nom}
                  onChange={(e) => setSelectedMember({ ...selectedMember, nom: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={selectedMember.email}
                  onChange={(e) => setSelectedMember({ ...selectedMember, email: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Rôle</Label>
                <Select
                  value={selectedMember.role}
                  onValueChange={(v: any) => setSelectedMember({ ...selectedMember, role: v })}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Membre">Membre</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Compétences</Label>
                <Input
                  value={selectedMember.competences?.join(", ") || ""}
                  onChange={(e) =>
                    setSelectedMember({ ...selectedMember, competences: e.target.value.split(",").map((s) => s.trim()) })
                  }
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Note</Label>
                <Input
                  value={selectedMember.note || ""}
                  onChange={(e) => setSelectedMember({ ...selectedMember, note: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label className="mb-2 block">Accès UI</Label>
                <div className="space-y-2 glass-card p-4 rounded-lg">
                  {Object.entries(selectedMember.access_controls || {}).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(e) =>
                          setSelectedMember({
                            ...selectedMember,
                            access_controls: { ...selectedMember.access_controls, [key]: e.target.checked },
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="capitalize text-sm">{key}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={handleEditMember} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
                Enregistrer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce membre ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Employee Access Dialog */}
      {selectedEmployee && (
        <CreateEmployeeAccessDialog
          open={accessDialogOpen}
          onOpenChange={setAccessDialogOpen}
          employee={selectedEmployee}
          onSuccess={loadTeam}
        />
      )}
    </div>
  );
};

export default Equipe;
