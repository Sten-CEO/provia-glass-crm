import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusChip } from "@/components/ui/status-chip";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Printer,
  MoreVertical,
  CalendarIcon,
  Upload,
  Image as ImageIcon,
  FileText,
  Package,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  computeQuoteTotals,
  QuoteLine,
  QuotePackage,
  UNITS,
  TVA_RATES,
} from "@/lib/quoteUtils";
import { EmailComposerModal } from "@/components/devis/EmailComposerModal";
import { eventBus, EVENTS } from "@/lib/eventBus";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Quote {
  id?: string;
  numero: string;
  title?: string;
  client_id: string;
  client_nom: string;
  property_address?: string;
  contact_phone?: string;
  contact_email?: string;
  salesperson?: string;
  issued_at?: string;
  expiry_date?: string;
  statut: string;
  lignes: QuoteLine[];
  packages: QuotePackage[];
  custom_fields: Array<{ key: string; value: string }>;
  discount_ht: number;
  required_deposit_ht: number;
  total_ht: number;
  total_ttc: number;
  client_message?: string;
  disclaimer?: string;
  conditions?: string;
  attachments: Array<{ id: string; name: string; url: string }>;
}

const DevisEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNewQuote = !id || id === "new";
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [quote, setQuote] = useState<Quote>({
    numero: "DRAFT-" + Date.now(),
    title: "Nouveau devis",
    client_id: "",
    client_nom: "",
    property_address: "",
    contact_phone: "",
    contact_email: "",
    salesperson: "",
    issued_at: new Date().toISOString().split("T")[0],
    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    statut: "Brouillon",
    lignes: [],
    packages: [],
    custom_fields: [],
    discount_ht: 0,
    required_deposit_ht: 0,
    total_ht: 0,
    total_ttc: 0,
    client_message: "",
    disclaimer: "",
    conditions: "",
    attachments: [],
  });

  useEffect(() => {
    // Load clients and employees in background (non-blocking)
    loadClients();
    loadEmployees();

    if (!isNewQuote && id) {
      setLoading(true);
      loadQuote();
      
      // Safety timeout - force render after 4s
      const timer = setTimeout(() => {
        setLoading(false);
        if (quote.id === undefined) {
          toast.error("Délai dépassé - impossible de charger le devis");
          navigate("/devis");
        }
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      // New quote - generate number in background but don't block render
      generateNumber();
    }
  }, [id]);

  const loadClients = async () => {
    try {
      const { data } = await supabase.from("clients").select("*");
      setClients(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await supabase.from("equipe").select("*");
      setEmployees(data || []);
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const generateNumber = async () => {
    try {
      const { data } = await supabase
        .from("devis")
        .select("numero")
        .order("created_at", { ascending: false })
        .limit(1);
      const lastNum = data?.[0]?.numero || "DEV-0000";
      const num = parseInt(lastNum.split("-")[1]) + 1;
      setQuote((q) => ({ ...q, numero: `DEV-${String(num).padStart(4, "0")}` }));
    } catch (error) {
      console.error("Error generating number:", error);
      // Keep the DRAFT number if generation fails
    }
  };

  const loadQuote = async () => {
    if (!id) return;
    const { data, error } = await supabase.from("devis").select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      toast.error("Erreur de chargement");
      navigate("/devis");
      return;
    }

    setQuote({
      id: data.id,
      numero: data.numero,
      title: data.title || "",
      client_id: data.client_id || "",
      client_nom: data.client_nom,
      property_address: data.property_address || "",
      contact_phone: data.contact_phone || "",
      contact_email: data.contact_email || "",
      salesperson: data.salesperson || "",
      issued_at: data.issued_at || new Date().toISOString().split("T")[0],
      expiry_date: data.expiry_date || "",
      statut: data.statut,
      lignes: (data.lignes as any) || [],
      packages: (data.packages as any) || [],
      custom_fields: (data.custom_fields as any) || [],
      discount_ht: data.remise || 0,
      required_deposit_ht: data.acompte || 0,
      total_ht: data.total_ht || 0,
      total_ttc: data.total_ttc || 0,
      client_message: data.message_client || "",
      disclaimer: data.conditions || "",
      conditions: data.conditions || "",
      attachments: [],
    });
    setLoading(false);
  };

  const recomputeTotals = () => {
    const totals = computeQuoteTotals(quote.lignes, quote.packages, quote.discount_ht);
    setQuote((q) => ({
      ...q,
      total_ht: totals.total_ht,
      total_ttc: totals.total_ttc,
    }));
  };

  useEffect(() => {
    recomputeTotals();
  }, [quote.lignes, quote.packages, quote.discount_ht]);

  const handleSave = async () => {
    if (!quote.client_id) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    // Generate proper number if still using draft number
    let finalNumber = quote.numero;
    if (finalNumber.startsWith("DRAFT-")) {
      try {
        const { data } = await supabase
          .from("devis")
          .select("numero")
          .order("created_at", { ascending: false })
          .limit(1);
        const lastNum = data?.[0]?.numero || "DEV-0000";
        const num = parseInt(lastNum.split("-")[1]) + 1;
        finalNumber = `DEV-${String(num).padStart(4, "0")}`;
      } catch (error) {
        finalNumber = `DEV-${String(Date.now()).slice(-4)}`;
      }
    }

    const payload = {
      numero: finalNumber,
      title: quote.title,
      client_id: quote.client_id,
      client_nom: quote.client_nom,
      property_address: quote.property_address,
      contact_phone: quote.contact_phone,
      contact_email: quote.contact_email,
      salesperson: quote.salesperson,
      issued_at: quote.issued_at,
      expiry_date: quote.expiry_date,
      statut: quote.statut,
      lignes: quote.lignes as unknown as any,
      packages: quote.packages as unknown as any,
      custom_fields: quote.custom_fields as unknown as any,
      remise: quote.discount_ht,
      acompte: quote.required_deposit_ht,
      total_ht: quote.total_ht,
      total_ttc: quote.total_ttc,
      message_client: quote.client_message,
      conditions: quote.disclaimer,
      montant: String(quote.total_ttc),
    };

    if (id && !isNewQuote && quote.id) {
      const { error } = await supabase.from("devis").update(payload).eq("id", id);
      if (error) {
        toast.error("Erreur de sauvegarde");
        return;
      }
      setQuote((q) => ({ ...q, numero: finalNumber }));
    } else {
      const { data, error } = await supabase.from("devis").insert([payload]).select().single();
      if (error) {
        toast.error("Erreur de création");
        return;
      }
      setQuote((q) => ({ ...q, id: data.id, numero: finalNumber }));
      navigate(`/devis/${data.id}/edit`, { replace: true });
    }

    toast.success("Devis enregistré");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: "quotes" });
  };

  const handleSend = async () => {
    await handleSave();
    const quoteId = quote.id;
    if (quoteId) {
      await supabase.from("devis").update({ statut: "Envoyé", date_envoi: new Date().toISOString() }).eq("id", quoteId);
      setQuote((q) => ({ ...q, statut: "Envoyé" }));
      setEmailModalOpen(true);
    } else {
      toast.error("Veuillez d'abord enregistrer le devis");
    }
  };

  const handleEmailSend = async (to: string[], subject: string, body: string) => {
    // Stub for Phase 3
    console.log("Email stub:", { to, subject, body });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: "quotes" });
  };

  const handleConvertToJob = async () => {
    if (!quote.id) {
      toast.error("Veuillez d'abord enregistrer le devis");
      return;
    }

    const jobPayload = {
      titre: quote.title || `Intervention ${quote.numero}`,
      client_id: quote.client_id,
      client_nom: quote.client_nom,
      employe_nom: "",
      adresse: quote.property_address || "",
      statut: "À faire",
      date: new Date().toISOString().split("T")[0],
      checklist: quote.lignes.map((l) => ({
        id: crypto.randomUUID(),
        label: l.name,
        done: false,
      })) as unknown as any,
      notes: `Créé depuis devis ${quote.numero}`,
      converted_from_quote_id: quote.id,
    };

    const { data: newJob, error: jobError } = await supabase.from("jobs").insert([jobPayload]).select().single();

    if (jobError || !newJob) {
      toast.error("Erreur", { description: "Échec de création du job" });
      return;
    }

    await supabase.from("devis").update({ converted_to_job_id: newJob.id }).eq("id", quote.id);

    toast.success("Job créé avec succès");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: "jobs" });
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: "quotes" });
    
    // Navigate to the new job
    navigate(`/jobs/${newJob.id}`);
  };

  const handleConvertToInvoice = async () => {
    if (!quote.id) {
      toast.error("Veuillez d'abord enregistrer le devis");
      return;
    }

    const includedLines = quote.lignes.filter((l) => !l.optional || l.included === true);

    const invoicePayload = {
      client_id: quote.client_id,
      client_nom: quote.client_nom,
      numero: `FAC-${String(Date.now()).slice(-4)}`,
      montant: String(quote.total_ttc),
      echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      statut: "En attente",
      lignes: includedLines.map((l) => ({
        name: l.name,
        description: l.description || "",
        qty: l.qty,
        unit: l.unit,
        unit_price_ht: l.unit_price_ht,
        tva_rate: l.tva_rate,
      })) as unknown as any,
      total_ht: quote.total_ht,
      total_ttc: quote.total_ttc,
      remise: quote.discount_ht,
      converted_from_quote_id: quote.id,
    };

    const { data: newInvoice, error: invoiceError } = await supabase
      .from("factures")
      .insert([invoicePayload])
      .select()
      .single();

    if (invoiceError || !newInvoice) {
      toast.error("Erreur", { description: "Échec de création de la facture" });
      return;
    }

    await supabase.from("devis").update({ converted_to_invoice_id: newInvoice.id }).eq("id", quote.id);

    toast.success("Facture créée avec succès");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: "invoices" });
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: "quotes" });
    
    // Navigate to the new invoice
    navigate(`/factures/${newInvoice.id}`);
  };

  const addLine = (optional: boolean = false) => {
    const newLine: QuoteLine = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      qty: 1,
      unit: "unité",
      unit_price_ht: 0,
      tva_rate: 20,
      optional,
      included: !optional,
    };
    setQuote((q) => ({ ...q, lignes: [...q.lignes, newLine] }));
  };

  const updateLine = (index: number, updates: Partial<QuoteLine>) => {
    setQuote((q) => ({
      ...q,
      lignes: q.lignes.map((line, i) => (i === index ? { ...line, ...updates } : line)),
    }));
  };

  const deleteLine = (index: number) => {
    setQuote((q) => ({
      ...q,
      lignes: q.lignes.filter((_, i) => i !== index),
    }));
  };

  const addPackage = () => {
    const newPackage: QuotePackage = {
      id: crypto.randomUUID(),
      name: "Nouveau package",
      description: "",
      lines: [],
      selected: false,
    };
    setQuote((q) => ({ ...q, packages: [...q.packages, newPackage] }));
  };

  const updatePackage = (index: number, updates: Partial<QuotePackage>) => {
    setQuote((q) => ({
      ...q,
      packages: q.packages.map((pkg, i) => (i === index ? { ...pkg, ...updates } : pkg)),
    }));
  };

  const deletePackage = (index: number) => {
    setQuote((q) => ({
      ...q,
      packages: q.packages.filter((_, i) => i !== index),
    }));
  };

  const addPackageLine = (packageIndex: number) => {
    const newLine: QuoteLine = {
      id: crypto.randomUUID(),
      name: "",
      qty: 1,
      unit: "unité",
      unit_price_ht: 0,
      tva_rate: 20,
    };
    setQuote((q) => ({
      ...q,
      packages: q.packages.map((pkg, i) =>
        i === packageIndex ? { ...pkg, lines: [...pkg.lines, newLine] } : pkg
      ),
    }));
  };

  const updatePackageLine = (packageIndex: number, lineIndex: number, updates: Partial<QuoteLine>) => {
    setQuote((q) => ({
      ...q,
      packages: q.packages.map((pkg, i) =>
        i === packageIndex
          ? {
              ...pkg,
              lines: pkg.lines.map((line, j) => (j === lineIndex ? { ...line, ...updates } : line)),
            }
          : pkg
      ),
    }));
  };

  const deletePackageLine = (packageIndex: number, lineIndex: number) => {
    setQuote((q) => ({
      ...q,
      packages: q.packages.map((pkg, i) =>
        i === packageIndex ? { ...pkg, lines: pkg.lines.filter((_, j) => j !== lineIndex) } : pkg
      ),
    }));
  };

  const addCustomField = () => {
    setQuote((q) => ({
      ...q,
      custom_fields: [...q.custom_fields, { key: "", value: "" }],
    }));
  };

  const updateCustomField = (index: number, key: string, value: string) => {
    setQuote((q) => ({
      ...q,
      custom_fields: q.custom_fields.map((field, i) =>
        i === index ? { key, value } : field
      ),
    }));
  };

  const deleteCustomField = (index: number) => {
    setQuote((q) => ({
      ...q,
      custom_fields: q.custom_fields.filter((_, i) => i !== index),
    }));
  };

  const getStatusVariant = (status: string) => {
    if (status === "Accepté") return "green";
    if (status === "Envoyé") return "blue";
    if (status === "Refusé") return "red";
    if (status === "Expiré") return "gray";
    return "gray";
  };

  const isExpired = quote.expiry_date && new Date(quote.expiry_date) < new Date() && ["Brouillon", "Envoyé"].includes(quote.statut);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass-card p-8 text-center">
          <div className="animate-pulse">Chargement du devis...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Sticky Header */}
      <div className="glass-card p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/devis")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{id ? `Modifier devis ${quote.numero}` : "Nouveau devis"}</h1>
              {isExpired && (
                <div className="flex items-center gap-2 mt-1">
                  <StatusChip variant="gray">Expiré</StatusChip>
                  <span className="text-xs text-muted-foreground">Échéance dépassée</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
            <Button onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toast.info("Duplication en cours...")}>
                  Dupliquer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => supabase.from("devis").update({ statut: "Brouillon" }).eq("id", id).then(() => loadQuote())}
                >
                  Marquer Brouillon
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => supabase.from("devis").update({ statut: "Accepté" }).eq("id", id).then(() => loadQuote())}
                >
                  Marquer Accepté
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => supabase.from("devis").update({ statut: "Refusé" }).eq("id", id).then(() => loadQuote())}
                >
                  Marquer Refusé
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleConvertToInvoice} disabled={!quote.id}>
                  Convertir en facture
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleConvertToJob} disabled={!quote.id}>
                  Convertir en job
                </DropdownMenuItem>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenuItem disabled className="opacity-50">
                          Lien d'approbation
                        </DropdownMenuItem>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Disponible en Phase 4</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs defaultValue="header" className="w-full">
        <TabsList className="glass-card grid w-full grid-cols-6">
          <TabsTrigger value="header">En-tête</TabsTrigger>
          <TabsTrigger value="lines">Produits/Services</TabsTrigger>
          <TabsTrigger value="payment">Paiement</TabsTrigger>
          <TabsTrigger value="custom">Champs perso</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="summary">Résumé</TabsTrigger>
        </TabsList>

        {/* En-tête */}
        <TabsContent value="header" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Titre du devis</Label>
                  <Input
                    value={quote.title}
                    onChange={(e) => setQuote({ ...quote, title: e.target.value })}
                    placeholder="Installation complète..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>N° Devis</Label>
                  <Input value={quote.numero} disabled className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Client *</Label>
                  <Select
                    value={quote.client_id}
                    onValueChange={(v) => {
                      const client = clients.find((c) => c.id === v);
                      setQuote({
                        ...quote,
                        client_id: v,
                        client_nom: client?.nom || "",
                        contact_email: client?.email || "",
                        contact_phone: client?.telephone || "",
                      });
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Commercial</Label>
                  <Select
                    value={quote.salesperson}
                    onValueChange={(v) => setQuote({ ...quote, salesperson: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Adresse du chantier</Label>
                <Input
                  value={quote.property_address}
                  onChange={(e) => setQuote({ ...quote, property_address: e.target.value })}
                  placeholder="Adresse complète..."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email de contact</Label>
                  <Input
                    type="email"
                    value={quote.contact_email}
                    onChange={(e) => setQuote({ ...quote, contact_email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Téléphone de contact</Label>
                  <Input
                    value={quote.contact_phone}
                    onChange={(e) => setQuote({ ...quote, contact_phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Date d'émission</Label>
                  <Input
                    type="date"
                    value={quote.issued_at}
                    onChange={(e) => setQuote({ ...quote, issued_at: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Date d'expiration *</Label>
                  <Input
                    type="date"
                    value={quote.expiry_date}
                    onChange={(e) => setQuote({ ...quote, expiry_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Statut</Label>
                  <div className="mt-1">
                    <StatusChip variant={getStatusVariant(quote.statut)}>
                      {quote.statut}
                    </StatusChip>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Produits/Services */}
        <TabsContent value="lines" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Lignes du devis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.lignes.map((line, idx) => (
                <div
                  key={line.id}
                  className="p-4 border rounded-lg space-y-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Nom *</Label>
                        <Input
                          value={line.name}
                          onChange={(e) => updateLine(idx, { name: e.target.value })}
                          placeholder="Installation..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Qté</Label>
                        <Input
                          type="number"
                          value={line.qty}
                          onChange={(e) => updateLine(idx, { qty: parseFloat(e.target.value) || 0 })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unité</Label>
                        <Select
                          value={line.unit}
                          onValueChange={(v) => updateLine(idx, { unit: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLine(idx)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={line.description}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      placeholder="Détails..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Prix HT</Label>
                      <Input
                        type="number"
                        value={line.unit_price_ht}
                        onChange={(e) =>
                          updateLine(idx, { unit_price_ht: parseFloat(e.target.value) || 0 })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">TVA %</Label>
                      <Select
                        value={String(line.tva_rate)}
                        onValueChange={(v) => updateLine(idx, { tva_rate: parseFloat(v) })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TVA_RATES.map((r) => (
                            <SelectItem key={r} value={String(r)}>
                              {r}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={line.optional}
                          onCheckedChange={(checked) =>
                            updateLine(idx, { optional: checked === true, included: checked !== true })
                          }
                        />
                        <Label className="text-xs">Optionnelle</Label>
                      </div>
                    </div>
                    {line.optional && (
                      <div className="flex items-end">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={line.included}
                            onCheckedChange={(checked) =>
                              updateLine(idx, { included: checked === true })
                            }
                          />
                          <Label className="text-xs">Inclure</Label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right text-sm font-semibold">
                    Total ligne: €
                    {((line.included ? line.qty * line.unit_price_ht : 0) * (1 + line.tva_rate / 100)).toFixed(2)}
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <Button onClick={() => addLine(false)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Ligne
                </Button>
                <Button onClick={() => addLine(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Ligne optionnelle
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Packages */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Packages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.packages.map((pkg, pkgIdx) => (
                <div key={pkg.id} className="p-4 border rounded-lg space-y-3 bg-muted/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Nom du package</Label>
                          <Input
                            value={pkg.name}
                            onChange={(e) => updatePackage(pkgIdx, { name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={pkg.selected}
                              onCheckedChange={(checked) =>
                                updatePackage(pkgIdx, { selected: checked === true })
                              }
                            />
                            <Label>Sélectionné (inclure au total)</Label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={pkg.description}
                          onChange={(e) => updatePackage(pkgIdx, { description: e.target.value })}
                          rows={2}
                          className="mt-1"
                        />
                      </div>

                      {/* Package Lines */}
                      <div className="space-y-2 pl-4 border-l-2">
                        {pkg.lines.map((line, lineIdx) => (
                          <div
                            key={line.id}
                            className="grid grid-cols-1 md:grid-cols-6 gap-2 p-2 bg-background/50 rounded"
                          >
                            <Input
                              value={line.name}
                              onChange={(e) =>
                                updatePackageLine(pkgIdx, lineIdx, { name: e.target.value })
                              }
                              placeholder="Nom"
                              className="md:col-span-2"
                            />
                            <Input
                              type="number"
                              value={line.qty}
                              onChange={(e) =>
                                updatePackageLine(pkgIdx, lineIdx, {
                                  qty: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="Qté"
                            />
                            <Input
                              type="number"
                              value={line.unit_price_ht}
                              onChange={(e) =>
                                updatePackageLine(pkgIdx, lineIdx, {
                                  unit_price_ht: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="PU HT"
                            />
                            <Input
                              type="number"
                              value={line.tva_rate}
                              onChange={(e) =>
                                updatePackageLine(pkgIdx, lineIdx, {
                                  tva_rate: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="TVA %"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePackageLine(pkgIdx, lineIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={() => addPackageLine(pkgIdx)}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          Ligne
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePackage(pkgIdx)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button onClick={addPackage} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau package
              </Button>
            </CardContent>
          </Card>

          {/* Remise */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Remise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Remise HT (€)</Label>
                  <Input
                    type="number"
                    value={quote.discount_ht}
                    onChange={(e) =>
                      setQuote({ ...quote, discount_ht: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paiement */}
        <TabsContent value="payment" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Acompte et paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Acompte requis HT (€)</Label>
                <Input
                  type="number"
                  value={quote.required_deposit_ht}
                  onChange={(e) =>
                    setQuote({ ...quote, required_deposit_ht: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cet acompte sera mentionné dans l'email et le PDF
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Champs personnalisés */}
        <TabsContent value="custom" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Champs personnalisés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.custom_fields.map((field, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    value={field.key}
                    onChange={(e) => updateCustomField(idx, e.target.value, field.value)}
                    placeholder="Clé"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={field.value}
                      onChange={(e) => updateCustomField(idx, field.key, e.target.value)}
                      placeholder="Valeur"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCustomField(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button onClick={addCustomField} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un champ
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Message client</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={quote.client_message}
                onChange={(e) => setQuote({ ...quote, client_message: e.target.value })}
                placeholder="Message personnalisé pour le client..."
                rows={4}
              />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Mentions / Clauses</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={quote.disclaimer}
                onChange={(e) => setQuote({ ...quote, disclaimer: e.target.value })}
                placeholder="Conditions générales, clauses..."
                rows={6}
              />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pièces jointes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Glissez vos fichiers ici ou cliquez pour uploader
                </p>
                <Button variant="outline" className="mt-4">
                  Parcourir
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Note: L'upload de fichiers nécessite la configuration du Storage.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Résumé */}
        <TabsContent value="summary" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total HT:</span>
                  <span className="font-semibold">€{quote.total_ht.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TVA:</span>
                  <span className="font-semibold">
                    €{(quote.total_ttc - quote.total_ht).toFixed(2)}
                  </span>
                </div>
                {quote.discount_ht > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>Remise HT:</span>
                    <span className="font-semibold">-€{quote.discount_ht.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total TTC:</span>
                  <span>€{quote.total_ttc.toFixed(2)}</span>
                </div>
                {quote.required_deposit_ht > 0 && (
                  <div className="flex justify-between text-sm text-blue-600 pt-2">
                    <span>Acompte demandé:</span>
                    <span className="font-semibold">€{quote.required_deposit_ht.toFixed(2)} HT</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-500/10 rounded-lg flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Les lignes optionnelles non cochées ne sont pas incluses dans le total. Les
                  packages non sélectionnés sont également exclus.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Composer Modal */}
      <EmailComposerModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        quoteNumber={quote.numero}
        clientEmail={quote.contact_email || quote.client_nom}
        clientName={quote.client_nom}
        totalTTC={quote.total_ttc}
        onSend={handleEmailSend}
      />
    </div>
  );
};

export default DevisEditor;
