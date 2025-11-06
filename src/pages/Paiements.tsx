import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Paiements() {
  const [paiements, setPaiements] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    facture_id: "",
    facture_numero: "",
    montant: "",
    methode: "Virement",
    date_paiement: new Date(),
    notes: "",
  });

  useEffect(() => {
    loadPaiements();
    loadFactures();

    const channel = supabase
      .channel("paiements-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, loadPaiements)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPaiements = async () => {
    const { data } = await supabase
      .from("paiements")
      .select("*")
      .order("date_paiement", { ascending: false });
    if (data) setPaiements(data);
  };

  const loadFactures = async () => {
    const { data } = await supabase
      .from("factures")
      .select("*")
      .neq("statut", "Payée")
      .order("created_at", { ascending: false });
    if (data) setFactures(data);
  };

  const handleCreate = async () => {
    if (!formData.facture_id || !formData.montant) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    const { error } = await supabase.from("paiements").insert([
      {
        ...formData,
        montant: parseFloat(formData.montant),
        date_paiement: format(formData.date_paiement, "yyyy-MM-dd"),
      },
    ]);

    if (error) {
      toast.error("Erreur lors de la création");
      return;
    }

    // Update facture status if fully paid
    const facture = factures.find((f) => f.id === formData.facture_id);
    if (facture && parseFloat(formData.montant) >= parseFloat(facture.total_ttc || facture.montant)) {
      await supabase
        .from("factures")
        .update({ statut: "Payée", date_paiement: new Date().toISOString() })
        .eq("id", formData.facture_id);
    }

    toast.success("Paiement enregistré avec succès");
    setOpen(false);
    setFormData({
      facture_id: "",
      facture_numero: "",
      montant: "",
      methode: "Virement",
      date_paiement: new Date(),
      notes: "",
    });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("paiements").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Paiement supprimé");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Paiements</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              Enregistrer un paiement
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau paiement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Facture</Label>
                <Select
                  value={formData.facture_id}
                  onValueChange={(value) => {
                    const facture = factures.find((f) => f.id === value);
                    setFormData({
                      ...formData,
                      facture_id: value,
                      facture_numero: facture?.numero || "",
                      montant: facture?.total_ttc || facture?.montant || "",
                    });
                  }}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Sélectionner une facture" />
                  </SelectTrigger>
                  <SelectContent className="glass-modal">
                    {factures.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.numero} - {f.client_nom} ({f.total_ttc || f.montant} €)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Montant (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.montant}
                  onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                  className="glass-card"
                />
              </div>

              <div>
                <Label>Méthode de paiement</Label>
                <Select
                  value={formData.methode}
                  onValueChange={(value) => setFormData({ ...formData, methode: value })}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-modal">
                    <SelectItem value="Espèces">Espèces</SelectItem>
                    <SelectItem value="Virement">Virement</SelectItem>
                    <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
                    <SelectItem value="Chèque">Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date de paiement</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start glass-card">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.date_paiement, "PPP", { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass-modal">
                    <Calendar
                      mode="single"
                      selected={formData.date_paiement}
                      onSelect={(date) => date && setFormData({ ...formData, date_paiement: date })}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="glass-card"
                  rows={3}
                />
              </div>

              <Button onClick={handleCreate} className="w-full">
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Facture</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Méthode</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paiements.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{format(new Date(p.date_paiement), "dd/MM/yyyy")}</TableCell>
                <TableCell>{p.facture_numero}</TableCell>
                <TableCell className="font-semibold">{p.montant} €</TableCell>
                <TableCell>{p.methode}</TableCell>
                <TableCell>{p.notes}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => handleDelete(p.id)}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
