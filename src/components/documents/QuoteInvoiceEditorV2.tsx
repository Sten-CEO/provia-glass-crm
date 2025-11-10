import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, FileText, Mail, Copy, RefreshCw, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ClientPicker } from "./ClientPicker";
import { ServicesGrid } from "./ServicesGrid";
import { ConsumablesGrid } from "./ConsumablesGrid";
import { TotalsPanel } from "./TotalsPanel";
import { AddressFields, Address } from "./AddressFields";
import { AttachmentsPanel, Attachment } from "./AttachmentsPanel";
import { QuoteInvoiceDocument, DocumentLine, DocumentStatus } from "@/types/documents";
import { calculateDocumentTotals } from "@/lib/documentCalculations";
import { useTemplates } from "@/hooks/useTemplates";
import { useGenerateDocumentNumber } from "@/hooks/useDocumentNumbering";
import { InventoryItemSelector } from "@/components/devis/InventoryItemSelector";

interface QuoteInvoiceEditorV2Props {
  type: "quote" | "invoice";
  documentId?: string;
  onSave: (doc: QuoteInvoiceDocument) => Promise<void>;
  onCancel: () => void;
}

export function QuoteInvoiceEditorV2({
  type,
  documentId,
  onSave,
  onCancel,
}: QuoteInvoiceEditorV2Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Hooks pour templates et numérotation
  const { templates, defaultTemplate, loading: templatesLoading } = useTemplates(type);
  const generateNumberMutation = useGenerateDocumentNumber(type);

  const [document, setDocument] = useState<QuoteInvoiceDocument>({
    number: "",
    status: "draft",
    issueDate: new Date().toISOString().split("T")[0],
    clientName: "",
    lines: [],
    totals: {
      totalHT: 0,
      totalVAT: 0,
      totalTTC: 0,
    },
    billingAddress: {},
    siteAddress: {},
    externalRef: "",
    paymentTerms: type === "invoice" ? "Paiement à 30 jours" : "",
    hourlyRate: 0,
    attachments: [],
    miscFees: 0,
  });

  // Auto-générer le numéro et sélectionner le template par défaut
  useEffect(() => {
    if (!documentId && !document.number) {
      generateNumberMutation.mutate(undefined, {
        onSuccess: (num) => {
          setDocument((prev) => ({ ...prev, number: num }));
        },
      });
    }
    if (defaultTemplate && !selectedTemplateId) {
      setSelectedTemplateId(defaultTemplate.id);
      setDocument((prev) => ({ ...prev, theme: defaultTemplate.theme }));
    }
  }, [defaultTemplate, documentId]);

  // Récupérer le template sélectionné
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || defaultTemplate;

  // Auto-save avec debounce de 1s
  useEffect(() => {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

    const timeout = setTimeout(() => {
      if (document.clientName && document.lines.length > 0) {
        handleSave("draft", true);
      }
    }, 1000);

    setAutoSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [document]);

  // Recalcul des totaux quand les lignes changent
  useEffect(() => {
    const totals = calculateDocumentTotals(
      document.lines,
      document.totals.globalDiscountPct,
      document.totals.depositAmount
    );
    setDocument((prev) => ({ ...prev, totals }));
  }, [document.lines]);

  function updateDocument(updates: Partial<QuoteInvoiceDocument>) {
    setDocument((prev) => ({ ...prev, ...updates }));
  }

  function updateLines(lines: DocumentLine[]) {
    setDocument((prev) => ({ ...prev, lines }));
  }

  function updateTotals(updates: Partial<typeof document.totals>) {
    const newTotals = { ...document.totals, ...updates };
    const recalculated = calculateDocumentTotals(
      document.lines,
      newTotals.globalDiscountPct,
      newTotals.depositAmount
    );
    setDocument((prev) => ({ ...prev, totals: recalculated }));
  }

  async function handleSave(status?: DocumentStatus, silent = false) {
    if (!document.clientName) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    if (document.lines.length === 0 || document.lines.every((l) => !l.label)) {
      toast.error("Veuillez ajouter au moins une ligne");
      return;
    }

    setLoading(true);
    try {
      const docToSave = {
        ...document,
        status: status || document.status,
      };
      await onSave(docToSave);
      if (!silent) {
        toast.success(type === "quote" ? "Devis enregistré" : "Facture enregistrée");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  const statusVariants: Record<DocumentStatus, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    sent: "default",
    viewed: "default",
    accepted: "default",
    rejected: "destructive",
    invoiced: "default",
    paid: "default",
    partially_paid: "outline",
    cancelled: "destructive",
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="glass-card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {type === "quote" ? "Devis" : "Facture"} {document.number || "(Nouveau)"}
            </h1>
            <Badge variant={statusVariants[document.status]} className="mt-1">
              {document.status}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" disabled={loading}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" disabled={loading}>
            <Mail className="h-4 w-4 mr-2" />
            Envoyer
          </Button>
          <Button variant="outline" disabled={loading}>
            <Copy className="h-4 w-4 mr-2" />
            Dupliquer
          </Button>
          <Button onClick={() => handleSave()} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template & Client */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div>
              <Label>Modèle de document</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={templatesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name} {tpl.is_default && "⭐"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Client *</Label>
              <ClientPicker
                value={document.clientId}
                onChange={(clientId, client) =>
                  updateDocument({
                    clientId,
                    clientName: client.nom,
                  })
                }
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">Numéro</Label>
                <Input
                  id="number"
                  value={document.number}
                  onChange={(e) => updateDocument({ number: e.target.value })}
                  placeholder="Auto"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="issueDate">Date d'émission</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={document.issueDate}
                  onChange={(e) => updateDocument({ issueDate: e.target.value })}
                  disabled={loading}
                />
              </div>

              {type === "invoice" && (
                <div>
                  <Label htmlFor="dueDate">Date d'échéance</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={document.dueDate || ""}
                    onChange={(e) => updateDocument({ dueDate: e.target.value })}
                    disabled={loading}
                  />
                </div>
              )}

              {type === "quote" && (
                <div>
                  <Label htmlFor="validUntil">Valide jusqu'au</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={document.validUntil || ""}
                    onChange={(e) => updateDocument({ validUntil: e.target.value })}
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="externalRef">Référence externe (optionnel)</Label>
                <Input
                  id="externalRef"
                  value={document.externalRef || ""}
                  onChange={(e) => updateDocument({ externalRef: e.target.value })}
                  placeholder="Numéro de commande client..."
                  disabled={loading}
                />
              </div>

              {type === "invoice" && (
                <div>
                  <Label htmlFor="paymentTerms">Conditions de paiement</Label>
                  <Input
                    id="paymentTerms"
                    value={document.paymentTerms || ""}
                    onChange={(e) => updateDocument({ paymentTerms: e.target.value })}
                    placeholder="Ex: Paiement à 30 jours fin de mois"
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="hourlyRate">Taux horaire global (optionnel)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={document.hourlyRate || ""}
                  onChange={(e) => updateDocument({ hourlyRate: Number(e.target.value) })}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Adresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <AddressFields
                address={document.billingAddress as Address}
                onChange={(addr) => updateDocument({ billingAddress: addr })}
                label="Adresse de facturation"
                disabled={loading}
              />
              <div className="border-t pt-6">
                <AddressFields
                  address={document.siteAddress as Address}
                  onChange={(addr) => updateDocument({ siteAddress: addr })}
                  label="Adresse du site / chantier"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lines - Tabs */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Lignes du document</CardTitle>
            </CardHeader>
            <CardContent>
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="services">Services / Prestations</TabsTrigger>
                <TabsTrigger value="consumables">Consommables & Matériel</TabsTrigger>
              </TabsList>
              
              <TabsContent value="services" className="mt-4">
                <ServicesGrid
                  lines={document.lines}
                  onChange={updateLines}
                  disabled={loading}
                />
              </TabsContent>
              
              <TabsContent value="consumables" className="mt-4">
                <div className="mb-4 flex justify-end">
                  <InventoryItemSelector
                    onSelect={(item) => {
                      const newLine: DocumentLine = {
                        id: crypto.randomUUID(),
                        type: item.type === "consommable" ? "consumable" : "material",
                        ref: item.sku || "",
                        label: item.name,
                        description: "",
                        qty: 1,
                        unit: "unité",
                        unitPriceHT: item.unit_price_ht || 0,
                        vatRate: item.tva_rate || 20,
                        totalHT: item.unit_price_ht || 0,
                        totalVAT: ((item.unit_price_ht || 0) * (item.tva_rate || 20)) / 100,
                        totalTTC: (item.unit_price_ht || 0) * (1 + (item.tva_rate || 20) / 100),
                        inventory_item_id: item.id,
                        costPriceHT: item.unit_cost_ht,
                      };
                      updateLines([...document.lines, newLine]);
                      toast.success(`${item.name} ajouté`);
                    }}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Package className="h-4 w-4 mr-2" />
                        Articles d'inventaire
                      </Button>
                    }
                  />
                </div>
                <ConsumablesGrid
                  lines={document.lines}
                  onChange={updateLines}
                  disabled={loading}
                />
              </TabsContent>
            </Tabs>
            </CardContent>
          </Card>

          {/* Notes & Attachments */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Notes et documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notesClient">Notes client (visibles sur le PDF)</Label>
              <Textarea
                id="notesClient"
                value={document.notesClient || ""}
                onChange={(e) => updateDocument({ notesClient: e.target.value })}
                placeholder="Notes visibles par le client..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="notesInternal">Notes internes (non visibles)</Label>
              <Textarea
                id="notesInternal"
                value={document.notesInternal || ""}
                onChange={(e) => updateDocument({ notesInternal: e.target.value })}
                placeholder="Notes internes..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="terms">Conditions générales</Label>
              <Textarea
                id="terms"
                value={document.terms || ""}
                onChange={(e) => updateDocument({ terms: e.target.value })}
                placeholder="Conditions générales..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="border-t pt-4">
              <AttachmentsPanel
                attachments={(document.attachments || []) as Attachment[]}
                onChange={(attachments) => updateDocument({ attachments })}
                disabled={loading}
              />
            </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Totals & Actions */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Totaux</h2>
            <TotalsPanel
              totals={document.totals}
              onGlobalDiscountChange={(value) =>
                updateTotals({ globalDiscountPct: value })
              }
              onDepositChange={
                type === "quote"
                  ? (value) => updateTotals({ depositAmount: value })
                  : undefined
              }
              disabled={loading}
              showDeposit={type === "quote"}
              showVat={selectedTemplate?.show_vat ?? true}
              showDiscounts={selectedTemplate?.show_discounts ?? true}
              showRemainingBalance={selectedTemplate?.show_remaining_balance ?? (type === "invoice")}
            />

            <div className="mt-4 pt-4 border-t">
              <Label htmlFor="miscFees">Frais divers (€)</Label>
              <Input
                id="miscFees"
                type="number"
                step="0.01"
                value={document.miscFees || ""}
                onChange={(e) => updateDocument({ miscFees: Number(e.target.value) })}
                placeholder="0.00"
                disabled={loading}
                className="mt-1"
              />
            </div>
            </CardContent>
          </Card>

          {/* Convert & Actions */}
          <Card className="glass-card">
            <CardContent className="pt-6 space-y-3">
              {type === "quote" && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => toast.info("Conversion en facture...")}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Convertir en facture
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => toast.info("Conversion en intervention...")}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Convertir en intervention
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="glass-card">
            <CardContent className="pt-6">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={document.status}
              onValueChange={(value: DocumentStatus) =>
                updateDocument({ status: value })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="sent">Envoyé</SelectItem>
                <SelectItem value="viewed">Vu</SelectItem>
                <SelectItem value="accepted">Accepté</SelectItem>
                <SelectItem value="rejected">Refusé</SelectItem>
                {type === "invoice" && (
                  <>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="partially_paid">Partiellement payé</SelectItem>
                  </>
                )}
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
