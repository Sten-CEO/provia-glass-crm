import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
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

interface Quote {
  id: string;
  numero: string;
  client_id: string | null;
  client_nom: string;
  montant: string;
  statut: "Brouillon" | "Envoyé" | "Accepté" | "Refusé";
}

interface Client {
  id: string;
  nom: string;
}

const Devis = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [newQuote, setNewQuote] = useState({
    numero: `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    client_id: "",
    client_nom: "",
    montant: "",
    statut: "Brouillon" as const,
  });

  const loadQuotes = async () => {
    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setQuotes((data || []) as Quote[]);
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("id, nom");
    setClients(data || []);
  };

  useEffect(() => {
    loadQuotes();
    loadClients();

    const channel = supabase
      .channel("devis-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "devis" }, () => {
        loadQuotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddQuote = async () => {
    if (!newQuote.client_id || !newQuote.montant) {
      toast.error("Client et montant requis");
      return;
    }

    const client = clients.find((c) => c.id === newQuote.client_id);

    const { error } = await supabase.from("devis").insert([
      {
        numero: newQuote.numero,
        client_id: newQuote.client_id,
        client_nom: client?.nom || "",
        montant: newQuote.montant,
        statut: newQuote.statut,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Devis créé avec succès");
    setNewQuote({
      numero: `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      client_id: "",
      client_nom: "",
      montant: "",
      statut: "Brouillon",
    });
    setOpen(false);
  };

  const handleEditQuote = async () => {
    if (!selectedQuote) return;

    const { error } = await supabase
      .from("devis")
      .update({
        montant: selectedQuote.montant,
        statut: selectedQuote.statut,
      })
      .eq("id", selectedQuote.id);

    if (error) {
      toast.error("Échec de modification");
      return;
    }

    toast.success("Devis modifié avec succès");
    setEditOpen(false);
    setSelectedQuote(null);
  };

  const handleDeleteQuote = async () => {
    if (!selectedQuote) return;

    const { error } = await supabase.from("devis").delete().eq("id", selectedQuote.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Devis supprimé avec succès");
    setDeleteOpen(false);
    setSelectedQuote(null);
  };

  const getStatusColor = (statut: Quote["statut"]) => {
    switch (statut) {
      case "Accepté":
        return "bg-green-500/20 text-green-700";
      case "Envoyé":
        return "bg-blue-500/20 text-blue-700";
      case "Brouillon":
        return "bg-gray-500/20 text-gray-700";
      case "Refusé":
        return "bg-red-500/20 text-red-700";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Devis</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Devis
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Nouveau Devis</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Numéro</Label>
                <Input value={newQuote.numero} disabled className="glass-card" />
              </div>
              <div>
                <Label>Client *</Label>
                <Select value={newQuote.client_id} onValueChange={(v) => setNewQuote({ ...newQuote, client_id: v })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Montant *</Label>
                <Input
                  placeholder="€2,500"
                  value={newQuote.montant}
                  onChange={(e) => setNewQuote({ ...newQuote, montant: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={newQuote.statut} onValueChange={(v: any) => setNewQuote({ ...newQuote, statut: v })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brouillon">Brouillon</SelectItem>
                    <SelectItem value="Envoyé">Envoyé</SelectItem>
                    <SelectItem value="Accepté">Accepté</SelectItem>
                    <SelectItem value="Refusé">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddQuote} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
                Créer
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
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Numéro</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Client</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Montant</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{quote.numero}</td>
                  <td className="p-4 text-muted-foreground">{quote.client_nom}</td>
                  <td className="p-4 font-semibold">{quote.montant}</td>
                  <td className="p-4">
                    <Badge className={getStatusColor(quote.statut)}>{quote.statut}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedQuote(quote);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedQuote(quote);
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
            <DialogTitle className="uppercase tracking-wide">Modifier Devis</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div>
                <Label>Montant</Label>
                <Input
                  value={selectedQuote.montant}
                  onChange={(e) => setSelectedQuote({ ...selectedQuote, montant: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Select
                  value={selectedQuote.statut}
                  onValueChange={(v: any) => setSelectedQuote({ ...selectedQuote, statut: v })}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brouillon">Brouillon</SelectItem>
                    <SelectItem value="Envoyé">Envoyé</SelectItem>
                    <SelectItem value="Accepté">Accepté</SelectItem>
                    <SelectItem value="Refusé">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleEditQuote} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
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
              Êtes-vous sûr de vouloir supprimer ce devis ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuote} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Devis;
