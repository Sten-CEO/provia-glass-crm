import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Menu } from "lucide-react";
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
import { recomputeInvoiceTotals, formatCurrency } from "@/lib/invoiceUtils";
import { ExternalLink } from "lucide-react";

interface Invoice {
  id: string;
  numero: string;
  client_id: string | null;
  client_nom: string;
  montant: string;
  statut: "Payée" | "En attente" | "En retard";
  echeance: string;
  total_ht?: number;
  total_ttc?: number;
  lignes?: any[];
  remise?: number;
  date_paiement?: string;
}

interface Client {
  id: string;
  nom: string;
}

const Factures = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    numero: `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    client_id: "",
    montant: "",
    statut: "En attente" as const,
    echeance: new Date().toISOString().split("T")[0],
  });

  const loadInvoices = async () => {
    const { data, error } = await supabase
      .from("factures")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setInvoices((data || []) as Invoice[]);
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("id, nom");
    setClients(data || []);
  };

  useEffect(() => {
    loadInvoices();
    loadClients();

    const channel = supabase
      .channel("factures-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "factures" }, () => {
        loadInvoices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddInvoice = async () => {
    if (!newInvoice.client_id || !newInvoice.montant) {
      toast.error("Client et montant requis");
      return;
    }

    const client = clients.find((c) => c.id === newInvoice.client_id);

    const { error } = await supabase.from("factures").insert([
      {
        numero: newInvoice.numero,
        client_id: newInvoice.client_id,
        client_nom: client?.nom || "",
        montant: newInvoice.montant,
        statut: newInvoice.statut,
        echeance: newInvoice.echeance,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Facture créée avec succès");
    setNewInvoice({
      numero: `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      client_id: "",
      montant: "",
      statut: "En attente",
      echeance: new Date().toISOString().split("T")[0],
    });
    setOpen(false);
  };

  const handleEditInvoice = async () => {
    if (!selectedInvoice) return;

    // Fetch full invoice with lines to recompute
    const { data: fullInvoice } = await supabase
      .from("factures")
      .select("*")
      .eq("id", selectedInvoice.id)
      .single();

    if (!fullInvoice) {
      toast.error("Facture introuvable");
      return;
    }

    // Merge changes and recompute totals
    const updatedInvoice = recomputeInvoiceTotals({
      ...fullInvoice,
      statut: selectedInvoice.statut,
      echeance: selectedInvoice.echeance,
      remise: selectedInvoice.remise,
    });

    // Set paid_at if status changed to Payée
    const updateData: any = {
      statut: updatedInvoice.statut,
      echeance: updatedInvoice.echeance,
      total_ht: updatedInvoice.total_ht,
      total_ttc: updatedInvoice.total_ttc,
      remise: updatedInvoice.remise || 0,
    };

    if (selectedInvoice.statut === "Payée" && !fullInvoice.date_paiement) {
      updateData.date_paiement = new Date().toISOString();
    }

    const { error } = await supabase
      .from("factures")
      .update(updateData)
      .eq("id", selectedInvoice.id);

    if (error) {
      toast.error("Échec de modification");
      return;
    }

    toast.success("Facture modifiée avec succès");
    setEditOpen(false);
    setSelectedInvoice(null);
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;

    const { error } = await supabase.from("factures").delete().eq("id", selectedInvoice.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Facture supprimée avec succès");
    setDeleteOpen(false);
    setSelectedInvoice(null);
  };

  const getStatusColor = (statut: Invoice["statut"]) => {
    switch (statut) {
      case "Payée":
        return "bg-green-500/20 text-green-700";
      case "En attente":
        return "bg-blue-500/20 text-blue-700";
      case "En retard":
        return "bg-red-500/20 text-red-700";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Factures</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Facture
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Nouvelle Facture</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Numéro</Label>
                <Input value={newInvoice.numero} disabled className="glass-card" />
              </div>
              <div>
                <Label>Client *</Label>
                <Select value={newInvoice.client_id} onValueChange={(v) => setNewInvoice({ ...newInvoice, client_id: v })}>
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
                  value={newInvoice.montant}
                  onChange={(e) => setNewInvoice({ ...newInvoice, montant: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Échéance *</Label>
                <Input
                  type="date"
                  value={newInvoice.echeance}
                  onChange={(e) => setNewInvoice({ ...newInvoice, echeance: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={newInvoice.statut} onValueChange={(v: any) => setNewInvoice({ ...newInvoice, statut: v })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="En attente">En attente</SelectItem>
                    <SelectItem value="Payée">Payée</SelectItem>
                    <SelectItem value="En retard">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddInvoice} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
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
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Échéance</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                  <td 
                    className="p-4 font-medium cursor-pointer hover:text-primary transition-colors" 
                    onClick={() => navigate(`/factures/${invoice.id}`)}
                  >
                    {invoice.numero}
                  </td>
                  <td className="p-4 text-muted-foreground">{invoice.client_nom}</td>
                  <td className="p-4 font-semibold">
                    {invoice.total_ttc ? formatCurrency(invoice.total_ttc) : invoice.montant}
                  </td>
                  <td className="p-4 text-muted-foreground">{formatDate(invoice.echeance)}</td>
                  <td className="p-4">
                    <Badge className={getStatusColor(invoice.statut)}>{invoice.statut}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice);
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
            <DialogTitle className="uppercase tracking-wide">Modifier Facture</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="glass-card p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total HT</span>
                  <span className="font-semibold">
                    {selectedInvoice.total_ht ? formatCurrency(selectedInvoice.total_ht) : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total TTC</span>
                  <span className="font-bold">
                    {selectedInvoice.total_ttc ? formatCurrency(selectedInvoice.total_ttc) : selectedInvoice.montant}
                  </span>
                </div>
              </div>

              <div>
                <Label>Remise (HT)</Label>
                <Input
                  type="number"
                  value={selectedInvoice.remise || 0}
                  onChange={(e) => setSelectedInvoice({ ...selectedInvoice, remise: Number(e.target.value) })}
                  className="glass-card"
                />
              </div>

              <div>
                <Label>Échéance</Label>
                <Input
                  type="date"
                  value={selectedInvoice.echeance}
                  onChange={(e) => setSelectedInvoice({ ...selectedInvoice, echeance: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Select
                  value={selectedInvoice.statut}
                  onValueChange={(v: any) => setSelectedInvoice({ ...selectedInvoice, statut: v })}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="En attente">En attente</SelectItem>
                    <SelectItem value="Payée">Payée</SelectItem>
                    <SelectItem value="En retard">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => navigate(`/factures/${selectedInvoice.id}`)} 
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Modifier les lignes
              </Button>

              <Button onClick={handleEditInvoice} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
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
              Êtes-vous sûr de vouloir supprimer cette facture ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Factures;
