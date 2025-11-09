import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Tax {
  id: string;
  name: string;
  rate: number;
  is_default: boolean;
  is_active: boolean;
  description?: string;
}

interface DocumentNumbering {
  id: string;
  type: "quote" | "invoice" | "credit_note";
  prefix: string;
  pattern: string;
  next_number: number;
  reset_each_year: boolean;
}

const DOCUMENT_TYPES = {
  quote: "Devis",
  invoice: "Factures",
  credit_note: "Avoirs",
};

export default function Taxes() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [numbering, setNumbering] = useState<DocumentNumbering[]>([]);
  
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [numberingDialogOpen, setNumberingDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  const [selectedTax, setSelectedTax] = useState<Tax | null>(null);
  const [selectedNumbering, setSelectedNumbering] = useState<DocumentNumbering | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    rate: "",
    is_default: false,
    is_active: true,
    description: "",
  });

  const [numberingFormData, setNumberingFormData] = useState({
    prefix: "",
    pattern: "",
    reset_each_year: true,
  });

  useEffect(() => {
    loadTaxes();
    loadNumbering();
  }, []);

  const loadTaxes = async () => {
    const { data, error } = await supabase
      .from("taxes")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name");

    if (error) {
      toast.error("Erreur lors du chargement des taxes");
      return;
    }

    setTaxes(data || []);
  };

  const loadNumbering = async () => {
    const { data, error } = await supabase
      .from("document_numbering")
      .select("*")
      .order("type");

    if (error) {
      toast.error("Erreur lors du chargement de la numérotation");
      return;
    }

    setNumbering((data || []) as DocumentNumbering[]);
  };

  const handleAddTax = () => {
    setSelectedTax(null);
    setFormData({
      name: "",
      rate: "",
      is_default: false,
      is_active: true,
      description: "",
    });
    setTaxDialogOpen(true);
  };

  const handleEditTax = (tax: Tax) => {
    setSelectedTax(tax);
    setFormData({
      name: tax.name,
      rate: tax.rate.toString(),
      is_default: tax.is_default,
      is_active: tax.is_active,
      description: tax.description || "",
    });
    setTaxDialogOpen(true);
  };

  const handleSaveTax = async () => {
    if (!formData.name || !formData.rate) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const rate = parseFloat(formData.rate);
    if (isNaN(rate) || rate < 0) {
      toast.error("Le taux doit être un nombre positif");
      return;
    }

    try {
      // Si on définit cette taxe comme défaut, retirer le défaut des autres
      if (formData.is_default) {
        await supabase
          .from("taxes")
          .update({ is_default: false })
          .neq("id", selectedTax?.id || "");
      }

      const taxData = {
        name: formData.name,
        rate,
        is_default: formData.is_default,
        is_active: formData.is_active,
        description: formData.description || null,
      };

      if (selectedTax) {
        const { error } = await supabase
          .from("taxes")
          .update(taxData)
          .eq("id", selectedTax.id);

        if (error) throw error;
        toast.success("Taxe modifiée avec succès");
      } else {
        const { error } = await supabase
          .from("taxes")
          .insert([taxData]);

        if (error) throw error;
        toast.success("Taxe ajoutée avec succès");
      }

      setTaxDialogOpen(false);
      loadTaxes();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleSetDefaultTax = async (tax: Tax) => {
    try {
      // Retirer le défaut de toutes les taxes
      await supabase
        .from("taxes")
        .update({ is_default: false })
        .neq("id", "");

      // Définir la nouvelle taxe par défaut
      const { error } = await supabase
        .from("taxes")
        .update({ is_default: true })
        .eq("id", tax.id);

      if (error) throw error;

      toast.success("Taxe par défaut mise à jour");
      loadTaxes();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    }
  };

  const handleDeleteTax = async () => {
    if (!selectedTax) return;

    try {
      const { error } = await supabase
        .from("taxes")
        .delete()
        .eq("id", selectedTax.id);

      if (error) throw error;

      toast.success("Taxe supprimée avec succès");
      setDeleteDialogOpen(false);
      loadTaxes();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  const handleEditNumbering = (doc: DocumentNumbering) => {
    setSelectedNumbering(doc);
    setNumberingFormData({
      prefix: doc.prefix,
      pattern: doc.pattern,
      reset_each_year: doc.reset_each_year,
    });
    setNumberingDialogOpen(true);
  };

  const handleSaveNumbering = async () => {
    if (!selectedNumbering || !numberingFormData.pattern) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const { error } = await supabase
        .from("document_numbering")
        .update({
          prefix: numberingFormData.prefix,
          pattern: numberingFormData.pattern,
          reset_each_year: numberingFormData.reset_each_year,
        })
        .eq("id", selectedNumbering.id);

      if (error) throw error;

      toast.success("Configuration mise à jour avec succès");
      setNumberingDialogOpen(false);
      loadNumbering();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleResetCounter = async () => {
    if (!selectedNumbering) return;

    try {
      const { error } = await supabase
        .from("document_numbering")
        .update({ next_number: 1 })
        .eq("id", selectedNumbering.id);

      if (error) throw error;

      toast.success("Compteur réinitialisé avec succès");
      setResetDialogOpen(false);
      loadNumbering();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la réinitialisation");
    }
  };

  const generatePreview = (doc: DocumentNumbering | null) => {
    if (!doc) return "";
    
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const number = String(doc.next_number).padStart(4, "0");

    return doc.prefix + doc.pattern
      .replace("{YYYY}", year.toString())
      .replace("{YY}", year.toString().slice(-2))
      .replace("{MM}", month)
      .replace("{####}", number);
  };

  return (
    <div className="space-y-8">
      {/* Section Taux de TVA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Taux de taxes (TVA)</CardTitle>
              <CardDescription>
                Gérez les différents taux de TVA applicables dans vos documents
              </CardDescription>
            </div>
            <Button onClick={handleAddTax}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une taxe
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Taux</TableHead>
                <TableHead>Par défaut</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxes.map((tax) => (
                <TableRow key={tax.id}>
                  <TableCell className="font-medium">{tax.name}</TableCell>
                  <TableCell>{tax.rate} %</TableCell>
                  <TableCell>
                    {tax.is_default ? (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefaultTax(tax)}
                      >
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {tax.is_active ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTax(tax)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTax(tax);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section Numérotation automatique */}
      <Card>
        <CardHeader>
          <CardTitle>Numérotation automatique</CardTitle>
          <CardDescription>
            Configurez le format de numérotation pour vos documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type de document</TableHead>
                <TableHead>Préfixe</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Prochain numéro</TableHead>
                <TableHead>Aperçu</TableHead>
                <TableHead>Réinitialiser chaque année</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {numbering.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    {DOCUMENT_TYPES[doc.type]}
                  </TableCell>
                  <TableCell>{doc.prefix}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {doc.pattern}
                    </code>
                  </TableCell>
                  <TableCell>{doc.next_number}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-primary">
                      {generatePreview(doc)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {doc.reset_each_year ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNumbering(doc)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedNumbering(doc);
                          setResetDialogOpen(true);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Variables disponibles :</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <code className="bg-background px-2 py-1 rounded">
                  {"{YYYY}"}
                </code>{" "}
                — Année (4 chiffres)
              </div>
              <div>
                <code className="bg-background px-2 py-1 rounded">
                  {"{YY}"}
                </code>{" "}
                — Année (2 chiffres)
              </div>
              <div>
                <code className="bg-background px-2 py-1 rounded">
                  {"{MM}"}
                </code>{" "}
                — Mois
              </div>
              <div>
                <code className="bg-background px-2 py-1 rounded">
                  {"{####}"}
                </code>{" "}
                — Numéro séquentiel
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Taxe */}
      <Dialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTax ? "Modifier la taxe" : "Nouvelle taxe"}
            </DialogTitle>
            <DialogDescription>
              Définissez les paramètres de la taxe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tax-name">Nom de la taxe *</Label>
              <Input
                id="tax-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: TVA standard"
              />
            </div>

            <div>
              <Label htmlFor="tax-rate">Taux (%) *</Label>
              <Input
                id="tax-rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.rate}
                onChange={(e) =>
                  setFormData({ ...formData, rate: e.target.value })
                }
                placeholder="20"
              />
            </div>

            <div>
              <Label htmlFor="tax-description">Description</Label>
              <Textarea
                id="tax-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description optionnelle"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tax-active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked as boolean })
                }
              />
              <Label htmlFor="tax-active" className="cursor-pointer">
                Activer cette taxe
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tax-default"
                checked={formData.is_default}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_default: checked as boolean })
                }
              />
              <Label htmlFor="tax-default" className="cursor-pointer">
                Définir comme taxe par défaut
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTaxDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveTax}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Numérotation */}
      <Dialog open={numberingDialogOpen} onOpenChange={setNumberingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configuration - {selectedNumbering && DOCUMENT_TYPES[selectedNumbering.type]}
            </DialogTitle>
            <DialogDescription>
              Modifiez le format de numérotation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="prefix">Préfixe</Label>
              <Input
                id="prefix"
                value={numberingFormData.prefix}
                onChange={(e) =>
                  setNumberingFormData({
                    ...numberingFormData,
                    prefix: e.target.value,
                  })
                }
                placeholder="DEV-"
              />
            </div>

            <div>
              <Label htmlFor="pattern">Modèle *</Label>
              <Input
                id="pattern"
                value={numberingFormData.pattern}
                onChange={(e) =>
                  setNumberingFormData({
                    ...numberingFormData,
                    pattern: e.target.value,
                  })
                }
                placeholder="{YYYY}-{####}"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="reset-yearly"
                checked={numberingFormData.reset_each_year}
                onCheckedChange={(checked) =>
                  setNumberingFormData({
                    ...numberingFormData,
                    reset_each_year: checked as boolean,
                  })
                }
              />
              <Label htmlFor="reset-yearly" className="cursor-pointer">
                Réinitialiser le compteur chaque année
              </Label>
            </div>

            {selectedNumbering && (
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Aperçu</Label>
                <p className="text-lg font-mono text-primary mt-2">
                  {numberingFormData.prefix + numberingFormData.pattern
                    .replace("{YYYY}", new Date().getFullYear().toString())
                    .replace("{YY}", new Date().getFullYear().toString().slice(-2))
                    .replace("{MM}", String(new Date().getMonth() + 1).padStart(2, "0"))
                    .replace("{####}", String(selectedNumbering.next_number).padStart(4, "0"))}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNumberingDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveNumbering}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette taxe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La taxe "{selectedTax?.name}" sera
              définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTax} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Réinitialisation */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le compteur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le prochain numéro sera remis à 0001. Cette action peut créer des
              doublons si vous avez déjà des documents avec ce numéro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetCounter}>
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
