import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  ville: string | null;
  adresse: string | null;
  tva: string | null;
  notes: string | null;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ nom: "", email: "", telephone: "", ville: "", adresse: "", tva: "", notes: "" });
  const navigate = useNavigate();

  // Load clients
  const loadClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setClients(data || []);
  };

  useEffect(() => {
    loadClients();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("clients-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        () => {
          loadClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddClient = async () => {
    if (!newClient.nom || !newClient.email) {
      toast.error("Nom et email requis");
      return;
    }

    const { error } = await supabase.from("clients").insert([
      {
        nom: newClient.nom,
        email: newClient.email,
        telephone: newClient.telephone || null,
        ville: newClient.ville || null,
        adresse: newClient.adresse || null,
        tva: newClient.tva || null,
        notes: newClient.notes || null,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Client créé avec succès");
    setNewClient({ nom: "", email: "", telephone: "", ville: "", adresse: "", tva: "", notes: "" });
    setOpen(false);
  };

  const handleEditClient = async () => {
    if (!selectedClient) return;

    const { error } = await supabase
      .from("clients")
      .update({
        nom: selectedClient.nom,
        email: selectedClient.email,
        telephone: selectedClient.telephone,
        ville: selectedClient.ville,
        adresse: selectedClient.adresse,
        tva: selectedClient.tva,
        notes: selectedClient.notes,
      })
      .eq("id", selectedClient.id);

    if (error) {
      toast.error("Échec de modification");
      return;
    }

    toast.success("Client modifié avec succès");
    setEditOpen(false);
    setSelectedClient(null);
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", selectedClient.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Client supprimé avec succès");
    setDeleteOpen(false);
    setSelectedClient(null);
  };

  const filteredClients = clients.filter(
    (client) =>
      client.nom.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Clients</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Client
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Nouveau Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={newClient.nom}
                  onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={newClient.telephone}
                  onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  value={newClient.ville}
                  onChange={(e) => setNewClient({ ...newClient, ville: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={newClient.adresse}
                  onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="tva">Numéro TVA</Label>
                <Input
                  id="tva"
                  value={newClient.tva}
                  onChange={(e) => setNewClient({ ...newClient, tva: e.target.value })}
                  className="glass-card"
                />
              </div>
              <Button
                onClick={handleAddClient}
                className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold"
              >
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 glass-card"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Nom</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Email</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Téléphone</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Ville</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-white/5 hover:bg-muted/30 transition-colors"
                >
                  <td
                    className="p-4 font-medium cursor-pointer"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    {client.nom}
                  </td>
                  <td className="p-4 text-muted-foreground">{client.email}</td>
                  <td className="p-4 text-muted-foreground">{client.telephone || "-"}</td>
                  <td className="p-4 text-muted-foreground">{client.ville || "-"}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClient(client);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClient(client);
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
        <DialogContent className="glass-modal max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">Modifier Client</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  value={selectedClient.nom}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, nom: e.target.value })
                  }
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  value={selectedClient.email}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, email: e.target.value })
                  }
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={selectedClient.telephone || ""}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, telephone: e.target.value })
                  }
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Ville</Label>
                <Input
                  value={selectedClient.ville || ""}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, ville: e.target.value })
                  }
                  className="glass-card"
                />
              </div>
              <Button
                onClick={handleEditClient}
                className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold"
              >
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
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
