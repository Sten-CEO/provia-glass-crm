import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Save, Trash2, Star, Copy, FileText, Mail, Palette, Settings } from "lucide-react";
import { TableColumnsSelector } from "@/components/templates/TableColumnsSelector";
import { BackgroundStyleSelector } from "@/components/templates/BackgroundStyleSelector";
import { HeaderLayoutSelector } from "@/components/templates/HeaderLayoutSelector";
import { LivePdfPreview } from "@/components/templates/LivePdfPreview";
import { LiveEmailPreview } from "@/components/templates/LiveEmailPreview";
import { useDocumentTemplates, DocumentTemplate } from "@/hooks/useDocumentTemplates";
import { getAllVariables } from "@/lib/templateVariables";

const Templates = () => {
  const {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setAsDefault,
    duplicateTemplate,
    loadTemplates,
  } = useDocumentTemplates({ autoLoad: true });

  const [selectedTemplate, setSelectedTemplate] = useState<Partial<DocumentTemplate> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleNew = () => {
    // Déterminer le type selon le filtre actif
    let defaultType: "QUOTE" | "INVOICE" | "EMAIL" = "QUOTE";
    let defaultEmailType: string | null = null;
    let defaultName = "Nouveau modèle";

    if (filterType === "QUOTE") {
      defaultType = "QUOTE";
      defaultName = "Nouveau modèle de devis";
    } else if (filterType === "INVOICE") {
      defaultType = "INVOICE";
      defaultName = "Nouveau modèle de facture";
    } else if (filterType === "EMAIL") {
      defaultType = "EMAIL";
      defaultEmailType = "quote";
      defaultName = "Nouveau modèle d'email";
    }

    setSelectedTemplate({
      type: defaultType,
      name: defaultName,
      is_default: false,
      theme: "classique",
      main_color: "#3b82f6",
      accent_color: "#fbbf24",
      font_family: "Arial",
      background_style: "solid",
      header_layout: "logo-left",
      header_logo: null,
      logo_position: "left",
      logo_size: "medium",
      show_vat: true,
      show_discounts: true,
      show_remaining_balance: false,
      signature_enabled: false,
      email_subject: defaultType === "EMAIL" ? "Votre {{TypeDocument}} {{NumDocument}}" : null,
      email_body: defaultType === "EMAIL" ? "Bonjour {{NomClient}},\n\nVeuillez trouver ci-joint votre document.\n\nCordialement,\n{{NomEntreprise}}" : null,
      email_type: defaultEmailType,
      content_html: '<div style="padding: 20px;"><p>Contenu du document</p></div>',
      header_html: '<div style="text-align: center;"><h2>{{NomEntreprise}}</h2></div>',
      footer_html: '<div style="text-align: center; font-size: 12px;">{{NomEntreprise}} - Page 1</div>',
      css: "",
      table_columns: {
        description: true,
        reference: true,
        quantity: true,
        days: false,
        unit: true,
        unit_price_ht: true,
        vat_rate: true,
        discount: false,
        total_ht: true,
        total_ttc: true,
      },
      default_vat_rate: 20.0,
      default_payment_method: "Virement bancaire",
    });
    setIsEditing(true);
    setActiveTab("general");
  };

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate({ ...template });
    setIsEditing(true);
    setActiveTab("general");
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    const isNew = !selectedTemplate.id;

    if (isNew) {
      await createTemplate(selectedTemplate);
    } else {
      await updateTemplate(selectedTemplate.id!, selectedTemplate);
    }

    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) {
      await deleteTemplate(id);
    }
  };

  const handleDuplicate = async (template: DocumentTemplate) => {
    const duplicated = await duplicateTemplate(template);
    if (duplicated) {
      handleEdit(duplicated);
    }
  };

  const insertVariable = (variable: string, field: "email_subject" | "email_body") => {
    if (!selectedTemplate) return;

    const currentValue = selectedTemplate[field] || "";
    setSelectedTemplate({
      ...selectedTemplate,
      [field]: currentValue + variable,
    });
  };

  const filteredTemplates =
    filterType === "all"
      ? templates
      : templates.filter((t) => t.type === filterType);

  const isEmailTemplate = selectedTemplate?.type === "EMAIL";
  const documentType = selectedTemplate?.type === "QUOTE" ? "quote" : "invoice";

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modèles de documents</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos templates de devis, factures et emails
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau modèle
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          onClick={() => setFilterType("all")}
        >
          Tous ({templates.length})
        </Button>
        <Button
          variant={filterType === "QUOTE" ? "default" : "outline"}
          onClick={() => setFilterType("QUOTE")}
        >
          Devis ({templates.filter((t) => t.type === "QUOTE").length})
        </Button>
        <Button
          variant={filterType === "INVOICE" ? "default" : "outline"}
          onClick={() => setFilterType("INVOICE")}
        >
          Factures ({templates.filter((t) => t.type === "INVOICE").length})
        </Button>
        <Button
          variant={filterType === "EMAIL" ? "default" : "outline"}
          onClick={() => setFilterType("EMAIL")}
        >
          Emails ({templates.filter((t) => t.type === "EMAIL").length})
        </Button>
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="p-4 space-y-3 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: template.main_color || "#3b82f6" }}
                >
                  {template.type === "EMAIL" ? (
                    <Mail className="h-6 w-6 text-white" />
                  ) : (
                    <FileText className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{template.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {template.type === "QUOTE" && "Devis"}
                      {template.type === "INVOICE" && "Facture"}
                      {template.type === "EMAIL" && `Email (${template.email_type || "non défini"})`}
                    </span>
                  </div>
                </div>
              </div>
              {template.is_default && (
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0" />
              )}
            </div>

            {/* Color preview */}
            <div className="flex gap-2">
              <div
                className="h-6 w-6 rounded border"
                style={{ backgroundColor: template.main_color || "#3b82f6" }}
                title="Couleur principale"
              />
              <div
                className="h-6 w-6 rounded border"
                style={{ backgroundColor: template.accent_color || "#fbbf24" }}
                title="Couleur d'accent"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(template)}
              >
                Éditer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDuplicate(template)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copier
              </Button>
              {!template.is_default && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAsDefault(template.id, template.type)}
                >
                  <Star className="h-3 w-3 mr-1" />
                  Défaut
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(template.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Aucun modèle trouvé. Créez-en un !
          </p>
        </div>
      )}

      {/* Editor Dialog - Full screen with split view */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>
                {selectedTemplate?.id ? "Éditer le modèle" : "Nouveau modèle"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Sauvegarder
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div className="grid grid-cols-2 gap-0 h-[calc(95vh-80px)]">
              {/* Left side - Editor */}
              <div className="overflow-y-auto border-r p-6 bg-muted/30">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="general">Général</TabsTrigger>
                    <TabsTrigger value="apparence">
                      <Palette className="h-4 w-4 mr-2" />
                      Apparence
                    </TabsTrigger>
                    <TabsTrigger value="contenu">Contenu</TabsTrigger>
                    <TabsTrigger value="colonnes" disabled={isEmailTemplate}>
                      Colonnes
                    </TabsTrigger>
                    <TabsTrigger value="options">
                      <Settings className="h-4 w-4 mr-2" />
                      Options
                    </TabsTrigger>
                  </TabsList>

                  {/* GENERAL TAB */}
                  <TabsContent value="general" className="space-y-4">
                    <div>
                      <Label>Nom du modèle *</Label>
                      <Input
                        value={selectedTemplate.name}
                        onChange={(e) =>
                          setSelectedTemplate({ ...selectedTemplate, name: e.target.value })
                        }
                        placeholder="Ex: Devis standard"
                      />
                    </div>

                    <div>
                      <Label>Type de document *</Label>
                      <Select
                        value={selectedTemplate.type}
                        onValueChange={(v: any) =>
                          setSelectedTemplate({ ...selectedTemplate, type: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="QUOTE">Devis</SelectItem>
                          <SelectItem value="INVOICE">Facture</SelectItem>
                          <SelectItem value="EMAIL">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isEmailTemplate && (
                      <>
                        <div>
                          <Label>Type d'email</Label>
                          <Select
                            value={selectedTemplate.email_type || "quote"}
                            onValueChange={(v) =>
                              setSelectedTemplate({ ...selectedTemplate, email_type: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="quote">Devis</SelectItem>
                              <SelectItem value="invoice">Facture</SelectItem>
                              <SelectItem value="reminder">Relance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Police d'écriture</Label>
                          <Select
                            value={selectedTemplate.font_family || "Arial"}
                            onValueChange={(v) =>
                              setSelectedTemplate({ ...selectedTemplate, font_family: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Helvetica">Helvetica</SelectItem>
                              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Roboto">Roboto</SelectItem>
                              <SelectItem value="Verdana">Verdana</SelectItem>
                              <SelectItem value="Calibri">Calibri</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* APPARENCE TAB */}
                  <TabsContent value="apparence" className="space-y-6">
                    {isEmailTemplate ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>Les options d'apparence sont disponibles dans l'onglet "Général"</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Couleur principale</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                type="color"
                                value={selectedTemplate.main_color || "#3b82f6"}
                                onChange={(e) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    main_color: e.target.value,
                                  })
                                }
                                className="w-16 h-10 cursor-pointer"
                              />
                              <Input
                                value={selectedTemplate.main_color || "#3b82f6"}
                                onChange={(e) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    main_color: e.target.value,
                                  })
                                }
                                placeholder="#3b82f6"
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Couleur d'accent</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                type="color"
                                value={selectedTemplate.accent_color || "#fbbf24"}
                                onChange={(e) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    accent_color: e.target.value,
                                  })
                                }
                                className="w-16 h-10 cursor-pointer"
                              />
                              <Input
                                value={selectedTemplate.accent_color || "#fbbf24"}
                                onChange={(e) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    accent_color: e.target.value,
                                  })
                                }
                                placeholder="#fbbf24"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Police</Label>
                          <Select
                            value={selectedTemplate.font_family || "Arial"}
                            onValueChange={(v) =>
                              setSelectedTemplate({ ...selectedTemplate, font_family: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Helvetica">Helvetica</SelectItem>
                              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Roboto">Roboto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <BackgroundStyleSelector
                          value={selectedTemplate.background_style || "solid"}
                          onChange={(v) =>
                            setSelectedTemplate({ ...selectedTemplate, background_style: v })
                          }
                          mainColor={selectedTemplate.main_color}
                          accentColor={selectedTemplate.accent_color}
                        />

                        <HeaderLayoutSelector
                          value={selectedTemplate.header_layout || "logo-left"}
                          onChange={(v) =>
                            setSelectedTemplate({ ...selectedTemplate, header_layout: v })
                          }
                        />

                        <div>
                          <Label>Logo (URL)</Label>
                          <Input
                            value={selectedTemplate.header_logo || ""}
                            onChange={(e) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                header_logo: e.target.value,
                              })
                            }
                            placeholder="https://exemple.com/logo.png"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Taille du logo</Label>
                            <Select
                              value={selectedTemplate.logo_size || "medium"}
                              onValueChange={(v) =>
                                setSelectedTemplate({ ...selectedTemplate, logo_size: v })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Petit</SelectItem>
                                <SelectItem value="medium">Moyen</SelectItem>
                                <SelectItem value="large">Grand</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* CONTENU TAB */}
                  <TabsContent value="contenu" className="space-y-4">
                    {isEmailTemplate ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Sujet de l'email</Label>
                            <Select
                              onValueChange={(v) => insertVariable(v, "email_subject")}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="+ Variable" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllVariables().slice(0, 10).map((v) => (
                                  <SelectItem key={v.key} value={v.key}>
                                    {v.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Input
                            value={selectedTemplate.email_subject || ""}
                            onChange={(e) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                email_subject: e.target.value,
                              })
                            }
                            placeholder="Ex: Votre devis {{NumDevis}}"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Corps de l'email</Label>
                            <Select
                              onValueChange={(v) => insertVariable(v, "email_body")}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="+ Variable" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllVariables().slice(0, 10).map((v) => (
                                  <SelectItem key={v.key} value={v.key}>
                                    {v.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            value={selectedTemplate.email_body || ""}
                            onChange={(e) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                email_body: e.target.value,
                              })
                            }
                            rows={12}
                            placeholder="Bonjour {{NomClient}},&#10;&#10;Veuillez trouver ci-joint votre devis..."
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label>En-tête HTML</Label>
                          <Textarea
                            value={selectedTemplate.header_html || ""}
                            onChange={(e) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                header_html: e.target.value,
                              })
                            }
                            rows={6}
                            className="font-mono text-sm"
                            placeholder="<div>En-tête personnalisé</div>"
                          />
                        </div>

                        <div>
                          <Label>Corps HTML</Label>
                          <Textarea
                            value={selectedTemplate.content_html || ""}
                            onChange={(e) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                content_html: e.target.value,
                              })
                            }
                            rows={8}
                            className="font-mono text-sm"
                            placeholder="<div>Contenu principal</div>"
                          />
                        </div>

                        <div>
                          <Label>Pied de page HTML</Label>
                          <Textarea
                            value={selectedTemplate.footer_html || ""}
                            onChange={(e) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                footer_html: e.target.value,
                              })
                            }
                            rows={4}
                            className="font-mono text-sm"
                            placeholder="<div>Pied de page</div>"
                          />
                        </div>

                        <div>
                          <Label>CSS personnalisé</Label>
                          <Textarea
                            value={selectedTemplate.css || ""}
                            onChange={(e) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                css: e.target.value,
                              })
                            }
                            rows={6}
                            className="font-mono text-sm"
                            placeholder=".header { background: #f0f0f0; }"
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* COLONNES TAB */}
                  <TabsContent value="colonnes" className="space-y-4">
                    <TableColumnsSelector
                      value={selectedTemplate.table_columns || {}}
                      onChange={(cols) =>
                        setSelectedTemplate({ ...selectedTemplate, table_columns: cols })
                      }
                    />
                  </TabsContent>

                  {/* OPTIONS TAB */}
                  <TabsContent value="options" className="space-y-4">
                    {!isEmailTemplate && (
                      <>
                        <div>
                          <Label>Taux de TVA par défaut (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={selectedTemplate.default_vat_rate || 20}
                            onChange={(e) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                default_vat_rate: parseFloat(e.target.value),
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label>Méthode de paiement par défaut</Label>
                          <Input
                            value={selectedTemplate.default_payment_method || ""}
                            onChange={(e) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                default_payment_method: e.target.value,
                              })
                            }
                            placeholder="Ex: Virement bancaire"
                          />
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Afficher la TVA</Label>
                              <p className="text-xs text-muted-foreground">
                                Afficher le détail de la TVA
                              </p>
                            </div>
                            <Switch
                              checked={selectedTemplate.show_vat ?? true}
                              onCheckedChange={(v) =>
                                setSelectedTemplate({ ...selectedTemplate, show_vat: v })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Afficher les remises</Label>
                              <p className="text-xs text-muted-foreground">
                                Afficher les remises appliquées
                              </p>
                            </div>
                            <Switch
                              checked={selectedTemplate.show_discounts ?? true}
                              onCheckedChange={(v) =>
                                setSelectedTemplate({ ...selectedTemplate, show_discounts: v })
                              }
                            />
                          </div>

                          {selectedTemplate.type === "INVOICE" && (
                            <div className="flex items-center justify-between">
                              <div>
                                <Label>Afficher le solde restant</Label>
                                <p className="text-xs text-muted-foreground">
                                  Pour les factures partiellement payées
                                </p>
                              </div>
                              <Switch
                                checked={selectedTemplate.show_remaining_balance ?? false}
                                onCheckedChange={(v) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    show_remaining_balance: v,
                                  })
                                }
                              />
                            </div>
                          )}

                          {selectedTemplate.type === "QUOTE" && (
                            <div className="flex items-center justify-between">
                              <div>
                                <Label>Zone de signature</Label>
                                <p className="text-xs text-muted-foreground">
                                  Ajouter "Bon pour accord"
                                </p>
                              </div>
                              <Switch
                                checked={selectedTemplate.signature_enabled ?? false}
                                onCheckedChange={(v) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    signature_enabled: v,
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <Label>Modèle par défaut</Label>
                        <p className="text-xs text-muted-foreground">
                          Utiliser ce modèle par défaut
                        </p>
                      </div>
                      <Switch
                        checked={selectedTemplate.is_default ?? false}
                        onCheckedChange={(v) =>
                          setSelectedTemplate({ ...selectedTemplate, is_default: v })
                        }
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right side - Live Preview */}
              <div className="overflow-y-auto p-6 bg-gray-50">
                <div className="sticky top-0 mb-4 pb-2 bg-gray-50 border-b">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Aperçu en temps réel
                  </h3>
                </div>

                {isEmailTemplate ? (
                  <LiveEmailPreview
                    subject={selectedTemplate.email_subject || ""}
                    body={selectedTemplate.email_body || ""}
                    emailType={selectedTemplate.email_type as any}
                    fontFamily={selectedTemplate.font_family || "Arial"}
                  />
                ) : (
                  <LivePdfPreview
                    template={selectedTemplate}
                    documentType={documentType}
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
