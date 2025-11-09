import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, FileText, Mail, Copy } from "lucide-react";
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
import { toast } from "sonner";
import { ClientPicker } from "./ClientPicker";
import { ServicesGrid } from "./ServicesGrid";
import { ConsumablesGrid } from "./ConsumablesGrid";
import { TotalsPanel } from "./TotalsPanel";
import { QuoteInvoiceDocument, DocumentLine, DocumentStatus } from "@/types/documents";
import { calculateDocumentTotals } from "@/lib/documentCalculations";

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
  });

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
          {/* Client & Dates */}
          <div className="glass-card p-6 space-y-4">
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
            </div>
          </div>

          {/* Lines - Tabs pour Services et Consommables */}
          <div className="glass-card p-6">
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
                <ConsumablesGrid
                  lines={document.lines}
                  onChange={updateLines}
                  disabled={loading}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Notes */}
          <div className="glass-card p-6 space-y-4">
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
          </div>
        </div>

        {/* Right column - Totals & Actions */}
        <div className="space-y-6">
          <div className="glass-card p-6">
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
            />
          </div>

          {/* Status */}
          <div className="glass-card p-6">
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
          </div>
        </div>
      </div>
    </div>
  );
}
