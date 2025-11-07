import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, Download, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  tags: string[] | null;
  statut: string | null;
  demande: string | null;
  debut: string | null;
  fin: string | null;
}

interface ClientSummary {
  devisCount: number;
  devisAcceptes: number;
  facturesCount: number;
  facturesEnAttente: number;
  jobsCount: number;
  jobsEnCours: number;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsSummary, setClientsSummary] = useState<Map<string, ClientSummary>>(new Map());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ 
    nom: "", 
    email: "", 
    telephone: "", 
    ville: "", 
    adresse: "", 
    tva: "", 
    notes: "",
    tags: [] as string[],
    statut: "Actif",
    demande: "",
    debut: "",
    fin: ""
  });
  const [tagInput, setTagInput] = useState("");
  const navigate = useNavigate();

  // Get all unique tags from clients
  const allTags = Array.from(new Set(clients.flatMap(c => c.tags || [])));

  // Load clients and their summaries
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
    
    // Load summaries for all clients
    if (data) {
      const summaries = new Map<string, ClientSummary>();
      
      for (const client of data) {
        const [devisData, facturesData, jobsData] = await Promise.all([
          supabase.from("devis").select("statut").eq("client_id", client.id),
          supabase.from("factures").select("statut").eq("client_id", client.id),
          supabase.from("jobs").select("statut").eq("client_id", client.id),
        ]);

        summaries.set(client.id, {
          devisCount: devisData.data?.length || 0,
          devisAcceptes: devisData.data?.filter(d => d.statut === "Accepté").length || 0,
          facturesCount: facturesData.data?.length || 0,
          facturesEnAttente: facturesData.data?.filter(f => ["Envoyé", "En attente", "En retard"].includes(f.statut)).length || 0,
          jobsCount: jobsData.data?.length || 0,
          jobsEnCours: jobsData.data?.filter(j => j.statut === "En cours").length || 0,
        });
      }
      
      setClientsSummary(summaries);
    }
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
    if (!newClient.nom || (!newClient.email && !newClient.telephone)) {
      toast.error("Nom et (email OU téléphone) requis");
      return;
    }

    const { error } = await supabase.from("clients").insert([
      {
        nom: newClient.nom,
        email: newClient.email || null,
        telephone: newClient.telephone || null,
        ville: newClient.ville || null,
        adresse: newClient.adresse || null,
        tva: newClient.tva || null,
        notes: newClient.notes || null,
        tags: newClient.tags.length > 0 ? newClient.tags : null,
        statut: newClient.statut,
        demande: newClient.demande || null,
        debut: newClient.debut || null,
        fin: newClient.fin || null,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Client créé avec succès");
    setNewClient({ nom: "", email: "", telephone: "", ville: "", adresse: "", tva: "", notes: "", tags: [], statut: "Actif", demande: "", debut: "", fin: "" });
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
        tags: selectedClient.tags,
        statut: selectedClient.statut,
        demande: selectedClient.demande,
        debut: selectedClient.debut,
        fin: selectedClient.fin,
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

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.nom.toLowerCase().includes(search.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(search.toLowerCase())) ||
      (client.telephone && client.telephone.includes(search));
    
    const matchesStatus = filterStatus === "all" || client.statut === filterStatus;
    const matchesTag = filterTag === "all" || (client.tags && client.tags.includes(filterTag));
    
    return matchesSearch && matchesStatus && matchesTag;
  });

  const handleExportCSV = () => {
    const headers = ["Nom", "Email", "Téléphone", "Ville", "Adresse", "TVA", "Statut", "Tags", "Demande", "Début", "Fin", "Notes"];
    const rows = clients.map(c => [
      c.nom,
      c.email || "",
      c.telephone || "",
      c.ville || "",
      c.adresse || "",
      c.tva || "",
      c.statut || "",
      (c.tags || []).join(";"),
      c.demande || "",
      c.debut || "",
      c.fin || "",
      c.notes || "",
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Export CSV réussi");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      
      const newClients = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(",").map(v => v.replace(/"/g, "").trim());
        const client: any = {
          nom: values[0],
          email: values[1] || null,
          telephone: values[2] || null,
          ville: values[3] || null,
          adresse: values[4] || null,
          tva: values[5] || null,
          statut: values[6] || "Actif",
          tags: values[7] ? values[7].split(";") : null,
          demande: values[8] || null,
          debut: values[9] || null,
          fin: values[10] || null,
          notes: values[11] || null,
        };
        
        if (client.nom && (client.email || client.telephone)) {
          newClients.push(client);
        }
      }
      
      if (newClients.length > 0) {
        const { error } = await supabase.from("clients").insert(newClients);
        if (error) {
          toast.error("Erreur d'import");
        } else {
          toast.success(`${newClients.length} clients importés`);
        }
      }
    };
    reader.readAsText(file);
  };

  const getStatutBadgeColor = (statut: string | null) => {
    const colors: Record<string, string> = {
      "Actif": "bg-green-500",
      "Inactif": "bg-gray-500",
      "Nouveau": "bg-blue-500",
      "En cours": "bg-yellow-500",
      "Attente de réponses": "bg-orange-500",
      "Résolues": "bg-green-600",
      "Fermé": "bg-gray-600",
      "Rejeté": "bg-red-500",
    };
    return colors[statut || "Actif"] || "bg-gray-500";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Clients</h1>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
          <label>
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Importer CSV
              </span>
            </Button>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
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
              <div>
                <Label htmlFor="statut">Statut</Label>
                <select
                  id="statut"
                  value={newClient.statut}
                  onChange={(e) => setNewClient({ ...newClient, statut: e.target.value })}
                  className="w-full p-2 glass-card rounded-md"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Nouveau">Nouveau</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {newClient.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setNewClient({ ...newClient, tags: newClient.tags.filter((_, idx) => idx !== i) })}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        setNewClient({ ...newClient, tags: [...newClient.tags, tagInput.trim()] });
                        setTagInput("");
                      }
                    }}
                    placeholder="Ajouter un tag..."
                    className="glass-card"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tagInput.trim()) {
                        setNewClient({ ...newClient, tags: [...newClient.tags, tagInput.trim()] });
                        setTagInput("");
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
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
      </div>

      <div className="glass-card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 glass-card"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Filtrer par statut</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="Actif">Actif</SelectItem>
                <SelectItem value="Inactif">Inactif</SelectItem>
                <SelectItem value="Nouveau">Nouveau</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Fermé">Fermé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Filtrer par tag</Label>
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Nom</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Tags</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Activité</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const summary = clientsSummary.get(client.id);
                return (
                  <tr
                    key={client.id}
                    className="border-b border-white/5 hover:bg-muted/30 transition-colors"
                  >
                    <td
                      className="p-4 font-medium cursor-pointer"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <div>
                        <div className="font-semibold">{client.nom}</div>
                        <div className="text-xs text-muted-foreground">{client.email || client.telephone}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatutBadgeColor(client.statut)}>
                        {client.statut || "Actif"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {(client.tags || []).slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {(client.tags || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(client.tags || []).length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {summary && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {summary.devisAcceptes > 0 && (
                            <div>{summary.devisAcceptes} devis accepté{summary.devisAcceptes > 1 ? "s" : ""}</div>
                          )}
                          {summary.facturesEnAttente > 0 && (
                            <div>{summary.facturesEnAttente} facture{summary.facturesEnAttente > 1 ? "s" : ""} en attente</div>
                          )}
                          {summary.jobsEnCours > 0 && (
                            <div>{summary.jobsEnCours} job{summary.jobsEnCours > 1 ? "s" : ""} en cours</div>
                          )}
                          {!summary.devisAcceptes && !summary.facturesEnAttente && !summary.jobsEnCours && (
                            <div className="text-muted-foreground/50">Aucune activité</div>
                          )}
                        </div>
                      )}
                    </td>
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
                );
              })}
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
              <div>
                <Label>Statut</Label>
                <select
                  value={selectedClient.statut || "Actif"}
                  onChange={(e) => setSelectedClient({ ...selectedClient, statut: e.target.value })}
                  className="w-full p-2 glass-card rounded-md"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Nouveau">Nouveau</option>
                  <option value="En cours">En cours</option>
                  <option value="Fermé">Fermé</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(selectedClient.tags || []).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => 
                          setSelectedClient({ 
                            ...selectedClient, 
                            tags: (selectedClient.tags || []).filter((_, idx) => idx !== i) 
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        setSelectedClient({ 
                          ...selectedClient, 
                          tags: [...(selectedClient.tags || []), tagInput.trim()] 
                        });
                        setTagInput("");
                      }
                    }}
                    placeholder="Ajouter un tag..."
                    className="glass-card"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tagInput.trim()) {
                        setSelectedClient({ 
                          ...selectedClient, 
                          tags: [...(selectedClient.tags || []), tagInput.trim()] 
                        });
                        setTagInput("");
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
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
