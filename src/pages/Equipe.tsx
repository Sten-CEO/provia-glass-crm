import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/hooks/useCompany";
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
import { guidecrmMemberInvited } from "@/components/guidecrm"; // GUIDECRM

interface TeamMember {
  id: string;
  nom: string;
  role: "Owner" | "Admin" | "Manager" | "Backoffice" | "Employé terrain";
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
    equipe?: boolean;
    inventaire?: boolean;
    agenda?: boolean;
    tableau_de_bord?: boolean;  // Fixed: was "dashboard"
    chiffre_affaire?: boolean;   // Added: was missing
  };
}

const Equipe = () => {
  const { company } = useCompany();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null);
  const [tempPasswordDialogOpen, setTempPasswordDialogOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string>("");
  const [createdMemberEmail, setCreatedMemberEmail] = useState<string>("");
  const [createdMemberRole, setCreatedMemberRole] = useState<string>("");
  const [newMember, setNewMember] = useState({
    nom: "",
    role: "Employé terrain",
    email: "",
    competences: [] as string[],
    note: "",
    access_controls: {
      devis: false,
      planning: false,
      factures: false,
      clients: false,
      jobs: false,
      timesheets: false,
      paiements: false,
      parametres: false,
      equipe: false,
      inventaire: false,
      agenda: false,
      tableau_de_bord: false,
      chiffre_affaire: false,
    },
  });

  const loadTeam = async () => {
    if (!company?.id) return;

    const { data, error } = await supabase
      .from("equipe")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setTeam((data || []) as TeamMember[]);
  };

  useEffect(() => {
    if (company?.id) {
      loadTeam();

      const channel = supabase
        .channel("equipe-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "equipe" }, (payload) => {
          loadTeam();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [company?.id]);

  const generateTemporaryPassword = (): string => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  };

  const mapRoleToDbRole = (role: string): string => {
    const roleMapping: Record<string, string> = {
      "Employé terrain": "employe_terrain",
      "Owner": "owner",
      "Admin": "admin",
      "Manager": "manager",
      "Backoffice": "backoffice",
    };
    return roleMapping[role] || "employe_terrain";
  };

  const handleAddMember = async () => {
    if (!newMember.nom || !newMember.email) {
      toast.error("Nom et email requis");
      return;
    }

    if (!company?.id) {
      toast.error("Erreur: Aucune entreprise sélectionnée. Veuillez rafraîchir la page.");
      return;
    }

    try {
      const { data: newEmployeeData, error: insertError } = await supabase
        .from("equipe")
        .insert([
          {
            nom: newMember.nom,
            role: newMember.role,
            email: newMember.email,
            competences: newMember.competences,
            note: newMember.note,
            access_controls: newMember.access_controls,
            company_id: company.id,
          },
        ])
        .select()
        .single();

      if (insertError || !newEmployeeData) {
        toast.error("Échec de création");
        return;
      }

      const tempPassword = generateTemporaryPassword();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Session expirée");
        return;
      }

      const mappedRole = mapRoleToDbRole(newMember.role);

      const requestBody = {
        employeeId: newEmployeeData.id,
        email: newMember.email,
        password: tempPassword,
        firstName: newMember.nom.split(" ")[0],
        lastName: newMember.nom.split(" ").slice(1).join(" "),
        phone: null,
        sendEmail: false,
        role: mappedRole,
      };

      const { data: result, error: functionError } = await supabase.functions.invoke(
        'create-employee-account',
        { body: requestBody }
      );

      if (functionError) {
        throw new Error(functionError.message || "Erreur lors de la création du compte");
      }

      if (result?.error) {
        throw new Error(result.error || "Erreur lors de la création du compte");
      }

      await loadTeam();
      window.dispatchEvent(new Event('company-updated'));
      setTimeout(() => loadTeam(), 1000);

      setCreatedMemberEmail(newMember.email);
      setTemporaryPassword(tempPassword);
      setCreatedMemberRole(newMember.role);
      setTempPasswordDialogOpen(true);

      toast.success("Membre créé avec succès");
      guidecrmMemberInvited(); // GUIDECRM: Mark member invitation step complete
      setNewMember({
        nom: "",
        role: "Employé terrain",
        email: "",
        competences: [],
        note: "",
        access_controls: {
          devis: false,
          planning: false,
          factures: false,
          clients: false,
          jobs: false,
          timesheets: false,
          paiements: false,
          parametres: false,
          equipe: false,
          inventaire: false,
          agenda: false,
          tableau_de_bord: false,
          chiffre_affaire: false,
        },
      });
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du membre");
    }
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
        app_access_status: selectedMember.app_access_status,
      })
      .eq("id", selectedMember.id);

    if (error) {
      toast.error("Échec de modification");
      return;
    }

    toast.success("Employé modifié avec succès");
    setEditOpen(false);
    setSelectedMember(null);
    loadTeam(); // Reload to show updated status
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    const { error } = await supabase.from("equipe").delete().eq("id", selectedMember.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Employé supprimé avec succès");
    setDeleteOpen(false);
    setSelectedMember(null);
  };

  const getAccessControlLabel = (key: string): string => {
    const labels: Record<string, string> = {
      devis: "Devis",
      planning: "Planning",
      factures: "Factures",
      clients: "Clients",
      jobs: "Interventions",
      timesheets: "Pointage",
      paiements: "Paiements",
      parametres: "Paramètres",
      equipe: "Équipe",
      inventaire: "Inventaire",
      agenda: "Agenda",
      tableau_de_bord: "Tableau de bord",
      chiffre_affaire: "Chiffre d'affaire",
    };
    return labels[key] || key;
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
            <Button
              data-onboarding="btn-invite-member" /* GUIDECRM */
              className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide"
              disabled={!company?.id}
              title={!company?.id ? "Chargement de l'entreprise..." : ""}
            >
              <Plus className="mr-2 h-4 w-4" />
              Inviter un employé
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Inviter un employé</DialogTitle>
            </DialogHeader>
            {!company?.id && (
              <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border-2 border-yellow-500">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  ⚠️ Chargement de l'entreprise en cours... Veuillez patienter.
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  data-onboarding="input-member-nom" /* GUIDECRM */
                  placeholder="Jean Dupont"
                  value={newMember.nom}
                  onChange={(e) => setNewMember({ ...newMember, nom: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  data-onboarding="input-member-email" /* GUIDECRM */
                  type="email"
                  placeholder="jean@entreprise.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Rôle</Label>
                <Select
                  value={newMember.role}
                  onValueChange={(v: any) => {
                    // If Owner is selected, set all access_controls to true
                    if (v === "Owner") {
                      setNewMember({
                        ...newMember,
                        role: v,
                        access_controls: {
                          devis: true,
                          planning: true,
                          factures: true,
                          clients: true,
                          jobs: true,
                          timesheets: true,
                          paiements: true,
                          parametres: true,
                          equipe: true,
                          inventaire: true,
                          agenda: true,
                          tableau_de_bord: true,
                          chiffre_affaire: true,
                        }
                      });
                    } else {
                      // For other roles, keep existing access_controls
                      setNewMember({ ...newMember, role: v });
                    }
                  }}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employé terrain">Employé terrain (App uniquement)</SelectItem>
                          <SelectItem value="Owner">Owner (CRM + App optionnel)</SelectItem>
                          <SelectItem value="Admin">Admin (CRM + App optionnel)</SelectItem>
                          <SelectItem value="Manager">Manager (CRM + App optionnel)</SelectItem>
                          <SelectItem value="Backoffice">Backoffice (CRM + App optionnel)</SelectItem>
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
              {newMember.role !== "Employé terrain" && (
                <div>
                  <Label className="mb-2 block">
                    Accès UI (restrictions UI uniquement)
                    {newMember.role === "Owner" && (
                      <span className="text-xs text-muted-foreground ml-2">(Owner a accès à tout par défaut)</span>
                    )}
                  </Label>
                  <div className="space-y-2 glass-card p-4 rounded-lg">
                    {Object.entries(newMember.access_controls).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          disabled={newMember.role === "Owner" || newMember.role === "Employé terrain"}
                          onChange={(e) =>
                            setNewMember({
                              ...newMember,
                              access_controls: { ...newMember.access_controls, [key]: e.target.checked },
                            })
                          }
                          className="w-4 h-4"
                        />
                        <span className={`text-sm ${(newMember.role === "Owner" || newMember.role === "Employé terrain") ? "opacity-50" : ""}`}>{getAccessControlLabel(key)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button
                data-onboarding="btn-create-member" /* GUIDECRM */
                onClick={handleAddMember}
                className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold"
                disabled={!company?.id}
              >
                {!company?.id ? "Chargement..." : "Inviter"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden">
        {!company?.id ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
              <svg className="animate-spin h-8 w-8 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Chargement de l'entreprise...</h3>
            <p className="text-muted-foreground text-sm">
              Veuillez patienter pendant que nous chargeons les informations de votre entreprise.
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Si ce message persiste, veuillez rafraîchir la page.
            </p>
          </div>
        ) : team.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Aucun membre dans l'équipe pour le moment.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Entreprise ID: {company.id}
            </p>
          </div>
        ) : (
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
                      member.app_access_status === 'active' ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <Smartphone className="h-3 w-3 mr-1" />
                          Actif
                        </Badge>
                      ) : member.app_access_status === 'suspended' ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          <Smartphone className="h-3 w-3 mr-1" />
                          Suspendu
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          CRM seulement
                        </Badge>
                      )
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
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">Modifier Employé</DialogTitle>
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
              {selectedMember.user_id && (
                <div>
                  <Label>Accès Application Mobile</Label>
                  <Select
                    value={selectedMember.app_access_status || 'none'}
                    onValueChange={(v: any) => setSelectedMember({ ...selectedMember, app_access_status: v })}
                  >
                    <SelectTrigger className="glass-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun (CRM seulement)</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="suspended">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
              Êtes-vous sûr de vouloir supprimer cet employé ?
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

      {/* Temporary Password Dialog */}
      <Dialog open={tempPasswordDialogOpen} onOpenChange={setTempPasswordDialogOpen}>
        <DialogContent className="glass-modal max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Compte créé avec succès!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border-2 border-yellow-500">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                ⚠️ Important: Notez bien ce mot de passe temporaire
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                Ce mot de passe ne sera affiché qu'une seule fois. Assurez-vous de le copier avant de fermer cette fenêtre.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Email de connexion:</Label>
              <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                {createdMemberEmail}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mot de passe temporaire:</Label>
              <div className="p-3 bg-muted rounded-lg font-mono text-lg font-bold break-all">
                {temporaryPassword}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(temporaryPassword);
                  toast.success("Mot de passe copié!");
                }}
                className="w-full"
              >
                📋 Copier le mot de passe
              </Button>
            </div>

            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-500">
              <p className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">
                🔐 Page de connexion à utiliser:
              </p>
              {createdMemberRole === "Employé terrain" ? (
                <div className="space-y-3">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    Ce membre doit se connecter sur l'<strong>application employé</strong>:
                  </p>
                  <div className="p-2 bg-white dark:bg-gray-800 rounded font-mono text-sm break-all">
                    {window.location.origin}/employee/login
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/employee/login`);
                      toast.success("URL copiée!");
                    }}
                    className="w-full"
                  >
                    📋 Copier l'URL de connexion
                  </Button>
                  <div className="pt-2 border-t border-blue-300 dark:border-blue-700">
                    <p className="text-sm text-blue-900 dark:text-blue-200 mb-2">
                      📱 <strong>Installer l'application mobile :</strong>
                    </p>
                    <div className="p-2 bg-white dark:bg-gray-800 rounded font-mono text-sm break-all">
                      {window.location.origin}/download
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/download`);
                        toast.success("URL copiée!");
                      }}
                      className="w-full mt-2"
                    >
                      📋 Copier le lien de téléchargement
                    </Button>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      Envoyez ce lien à l'employé pour qu'il installe l'app sur son téléphone.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    Ce membre doit se connecter sur le <strong>CRM</strong> (pas l'app employé):
                  </p>
                  <div className="p-2 bg-white dark:bg-gray-800 rounded font-mono text-sm break-all">
                    {window.location.origin}/auth/login
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/auth/login`);
                      toast.success("URL copiée!");
                    }}
                    className="w-full"
                  >
                    📋 Copier l'URL de connexion
                  </Button>
                </div>
              )}
            </div>

            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-500">
              <p className="text-sm text-green-900 dark:text-green-200">
                💡 Il est recommandé de demander au nouveau membre de changer son mot de passe après la première connexion.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setTempPasswordDialogOpen(false)} className="bg-primary hover:bg-primary/90">
              J'ai noté le mot de passe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Equipe;
