import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save, Trash2, FileText, Star, Eye, Palette } from "lucide-react";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

interface Template {
  id: string;
  type: string;
  name: string;
  is_default: boolean;
  theme: string;
  header_logo: string | null;
  logo_position: string | null;
  logo_size: string | null;
  main_color: string | null;
  font_family: string | null;
  show_vat: boolean;
  show_discounts: boolean;
  show_remaining_balance: boolean;
  signature_enabled: boolean;
  email_subject: string | null;
  email_body: string | null;
  content_html: string;
  header_html: string | null;
  footer_html: string | null;
  css: string | null;
}

const Templates = () => {
  const { companyId } = useCurrentCompany();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("doc_templates")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Erreur lors du chargement des modèles");
      return;
    }
    setTemplates(data || []);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    if (!companyId) {
      toast.error("Impossible de déterminer votre société");
      return;
    }

    // Validation: content_html est requis et ne peut pas être vide
    const contentHtml = selectedTemplate.content_html?.trim() || '<div style="padding: 20px;">Contenu du document</div>';

    const templateData = {
      company_id: companyId,
      type: selectedTemplate.type,
      name: selectedTemplate.name,
      theme: selectedTemplate.theme || 'classique',
      header_logo: selectedTemplate.header_logo || null,
      logo_position: selectedTemplate.logo_position || 'left',
      logo_size: selectedTemplate.logo_size || 'medium',
      main_color: selectedTemplate.main_color || '#3b82f6',
      font_family: selectedTemplate.font_family || 'Arial',
      show_vat: selectedTemplate.show_vat ?? true,
      show_discounts: selectedTemplate.show_discounts ?? true,
      show_remaining_balance: selectedTemplate.show_remaining_balance ?? false,
      signature_enabled: selectedTemplate.signature_enabled ?? false,
      email_subject: selectedTemplate.email_subject || null,
      email_body: selectedTemplate.email_body || null,
      content_html: contentHtml,
      header_html: selectedTemplate.header_html || null,
      footer_html: selectedTemplate.footer_html || null,
      css: selectedTemplate.css || null,
      is_default: selectedTemplate.is_default ?? false,
    };

    const { error } = selectedTemplate.id === "new"
      ? await supabase.from("doc_templates").insert(templateData)
      : await supabase.from("doc_templates").update(templateData).eq("id", selectedTemplate.id);

    if (error) {
      console.error("Erreur détaillée:", error);
      toast.error(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
    } else {
      toast.success("Modèle sauvegardé avec succès");
      setIsEditing(false);
      loadTemplates();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("doc_templates").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Modèle supprimé");
      loadTemplates();
    }
  };

  const handleSetDefault = async (id: string, type: string) => {
    // Retirer le défaut des autres
    await supabase.from("doc_templates").update({ is_default: false }).eq("type", type);
    // Définir le nouveau défaut
    const { error } = await supabase.from("doc_templates").update({ is_default: true }).eq("id", id);
    if (error) {
      toast.error("Erreur");
    } else {
      toast.success("Modèle défini par défaut");
      loadTemplates();
    }
  };

  const filteredTemplates = filterType === "all" 
    ? templates 
    : templates.filter(t => t.type === filterType);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modèles de documents</h1>
          <p className="text-muted-foreground mt-1">Gérez les templates de devis, factures et emails</p>
        </div>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedTemplate({
                id: "new",
                type: "QUOTE",
                name: "Nouveau modèle",
                is_default: false,
                theme: "classique",
                header_logo: null,
                logo_position: "left",
                logo_size: "medium",
                main_color: "#3b82f6",
                font_family: "Arial",
                show_vat: true,
                show_discounts: true,
                show_remaining_balance: false,
                signature_enabled: false,
                email_subject: null,
                email_body: null,
                content_html: '<div style="padding: 20px; font-family: Arial, sans-serif;"><h1>Contenu du document</h1><p>Modifiez ce contenu selon vos besoins.</p></div>',
                header_html: '<div style="text-align: center; padding: 20px;"><h2>{company_name}</h2></div>',
                footer_html: '<div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">Page {page_number}</div>',
                css: "body { font-family: Arial, sans-serif; }",
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau modèle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate?.id === "new" ? "Nouveau modèle" : "Éditer le modèle"}</DialogTitle>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom du modèle</Label>
                    <Input
                      value={selectedTemplate.name}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                      placeholder="Ex: Devis standard"
                    />
                  </div>
                  <div>
                    <Label>Type de document</Label>
                    <Select
                      value={selectedTemplate.type}
                      onValueChange={(v) => setSelectedTemplate({ ...selectedTemplate, type: v })}
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
                </div>

                <Tabs defaultValue="apparence" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="apparence">
                      <Palette className="mr-2 h-4 w-4" />
                      Apparence
                    </TabsTrigger>
                    <TabsTrigger value="contenu">Contenu</TabsTrigger>
                    <TabsTrigger value="options">Options</TabsTrigger>
                    <TabsTrigger value="avance">Avancé</TabsTrigger>
                  </TabsList>

                  <TabsContent value="apparence" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Thème</Label>
                        <Select
                          value={selectedTemplate.theme}
                          onValueChange={(v) => setSelectedTemplate({ ...selectedTemplate, theme: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classique">Classique</SelectItem>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="détaillé">Détaillé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Police</Label>
                        <Select
                          value={selectedTemplate.font_family || "Arial"}
                          onValueChange={(v) => setSelectedTemplate({ ...selectedTemplate, font_family: v })}
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Couleur principale</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selectedTemplate.main_color || "#3b82f6"}
                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, main_color: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            value={selectedTemplate.main_color || "#3b82f6"}
                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, main_color: e.target.value })}
                            placeholder="#3b82f6"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Logo (URL)</Label>
                        <Input
                          value={selectedTemplate.header_logo || ""}
                          onChange={(e) => setSelectedTemplate({ ...selectedTemplate, header_logo: e.target.value })}
                          placeholder="https://exemple.com/logo.png"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Position du logo</Label>
                        <Select
                          value={selectedTemplate.logo_position || "left"}
                          onValueChange={(v) => setSelectedTemplate({ ...selectedTemplate, logo_position: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Gauche</SelectItem>
                            <SelectItem value="center">Centré</SelectItem>
                            <SelectItem value="right">Droite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Taille du logo</Label>
                        <Select
                          value={selectedTemplate.logo_size || "medium"}
                          onValueChange={(v) => setSelectedTemplate({ ...selectedTemplate, logo_size: v })}
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

                    {selectedTemplate.header_logo && (
                      <div className="p-4 border rounded-lg">
                        <Label className="mb-2 block">Aperçu du logo</Label>
                        <div className={`flex ${selectedTemplate.logo_position === 'center' ? 'justify-center' : selectedTemplate.logo_position === 'right' ? 'justify-end' : 'justify-start'}`}>
                          <img 
                            src={selectedTemplate.header_logo} 
                            alt="Logo preview"
                            className={`${selectedTemplate.logo_size === 'small' ? 'h-12' : selectedTemplate.logo_size === 'large' ? 'h-24' : 'h-16'} object-contain`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="contenu" className="space-y-4 pt-4">
                    {selectedTemplate.type === "EMAIL" ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Sujet de l'email</Label>
                            <Select onValueChange={(v) => {
                              const cursorPos = document.querySelector<HTMLInputElement>('input[placeholder*="devis"]')?.selectionStart || 0;
                              const currentValue = selectedTemplate.email_subject || "";
                              const newValue = currentValue.slice(0, cursorPos) + v + currentValue.slice(cursorPos);
                              setSelectedTemplate({ ...selectedTemplate, email_subject: newValue });
                            }}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="+ Insérer variable" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="{client_name}">{"{client_name}"}</SelectItem>
                                <SelectItem value="{company_name}">{"{company_name}"}</SelectItem>
                                <SelectItem value="{document_number}">{"{document_number}"}</SelectItem>
                                <SelectItem value="{total_ht}">{"{total_ht}"}</SelectItem>
                                <SelectItem value="{total_ttc}">{"{total_ttc}"}</SelectItem>
                                <SelectItem value="{date}">{"{date}"}</SelectItem>
                                <SelectItem value="{document_type}">{"{document_type}"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Input
                            value={selectedTemplate.email_subject || ""}
                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, email_subject: e.target.value })}
                            placeholder="Ex: Votre devis #{document_number}"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Variables disponibles: {"{client_name}"}, {"{document_number}"}, {"{total_ttc}"}, {"{company_name}"}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Corps de l'email</Label>
                            <Select onValueChange={(v) => {
                              const textarea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="Bonjour"]');
                              const cursorPos = textarea?.selectionStart || 0;
                              const currentValue = selectedTemplate.email_body || "";
                              const newValue = currentValue.slice(0, cursorPos) + v + currentValue.slice(cursorPos);
                              setSelectedTemplate({ ...selectedTemplate, email_body: newValue });
                            }}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="+ Insérer variable" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="{client_name}">{"{client_name}"}</SelectItem>
                                <SelectItem value="{company_name}">{"{company_name}"}</SelectItem>
                                <SelectItem value="{document_number}">{"{document_number}"}</SelectItem>
                                <SelectItem value="{total_ht}">{"{total_ht}"}</SelectItem>
                                <SelectItem value="{total_ttc}">{"{total_ttc}"}</SelectItem>
                                <SelectItem value="{date}">{"{date}"}</SelectItem>
                                <SelectItem value="{document_type}">{"{document_type}"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            value={selectedTemplate.email_body || ""}
                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, email_body: e.target.value })}
                            rows={12}
                            placeholder="Bonjour {client_name},&#10;&#10;Veuillez trouver ci-joint votre devis #{document_number}..."
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>En-tête HTML</Label>
                            <Select onValueChange={(v) => {
                              const textarea = document.querySelectorAll<HTMLTextAreaElement>('textarea')[0];
                              const cursorPos = textarea?.selectionStart || 0;
                              const currentValue = selectedTemplate.header_html || "";
                              const newValue = currentValue.slice(0, cursorPos) + v + currentValue.slice(cursorPos);
                              setSelectedTemplate({ ...selectedTemplate, header_html: newValue });
                            }}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="+ Insérer variable" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="{company_name}">{"{company_name}"}</SelectItem>
                                <SelectItem value="{client_name}">{"{client_name}"}</SelectItem>
                                <SelectItem value="{document_number}">{"{document_number}"}</SelectItem>
                                <SelectItem value="{date}">{"{date}"}</SelectItem>
                                <SelectItem value="{due_date}">{"{due_date}"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            value={selectedTemplate.header_html || ""}
                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, header_html: e.target.value })}
                            rows={6}
                            className="font-mono text-sm"
                            placeholder="HTML pour l'en-tête du document"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Corps HTML</Label>
                            <Select onValueChange={(v) => {
                              const textarea = document.querySelectorAll<HTMLTextAreaElement>('textarea')[1];
                              const cursorPos = textarea?.selectionStart || 0;
                              const currentValue = selectedTemplate.content_html || "";
                              const newValue = currentValue.slice(0, cursorPos) + v + currentValue.slice(cursorPos);
                              setSelectedTemplate({ ...selectedTemplate, content_html: newValue });
                            }}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="+ Insérer variable" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="{total_ht}">{"{total_ht}"}</SelectItem>
                                <SelectItem value="{total_ttc}">{"{total_ttc}"}</SelectItem>
                                <SelectItem value="{client_name}">{"{client_name}"}</SelectItem>
                                <SelectItem value="{document_number}">{"{document_number}"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            value={selectedTemplate.content_html}
                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, content_html: e.target.value })}
                            rows={10}
                            className="font-mono text-sm"
                            placeholder="HTML pour le corps du document"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Pied de page HTML</Label>
                            <Select onValueChange={(v) => {
                              const textarea = document.querySelectorAll<HTMLTextAreaElement>('textarea')[2];
                              const cursorPos = textarea?.selectionStart || 0;
                              const currentValue = selectedTemplate.footer_html || "";
                              const newValue = currentValue.slice(0, cursorPos) + v + currentValue.slice(cursorPos);
                              setSelectedTemplate({ ...selectedTemplate, footer_html: newValue });
                            }}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="+ Insérer variable" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="{company_name}">{"{company_name}"}</SelectItem>
                                <SelectItem value="{date}">{"{date}"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            value={selectedTemplate.footer_html || ""}
                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, footer_html: e.target.value })}
                            rows={6}
                            className="font-mono text-sm"
                            placeholder="HTML pour le pied de page (mentions légales, CGV, etc.)"
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="options" className="space-y-4 pt-4">
                    {selectedTemplate.type !== "EMAIL" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Afficher la TVA</Label>
                            <p className="text-xs text-muted-foreground">Affiche le détail de la TVA par taux</p>
                          </div>
                          <Switch
                            checked={selectedTemplate.show_vat}
                            onCheckedChange={(v) => setSelectedTemplate({ ...selectedTemplate, show_vat: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Afficher les remises</Label>
                            <p className="text-xs text-muted-foreground">Affiche les remises appliquées</p>
                          </div>
                          <Switch
                            checked={selectedTemplate.show_discounts}
                            onCheckedChange={(v) => setSelectedTemplate({ ...selectedTemplate, show_discounts: v })}
                          />
                        </div>
                        {selectedTemplate.type === "INVOICE" && (
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Afficher le total restant dû</Label>
                              <p className="text-xs text-muted-foreground">Utile pour les factures partiellement payées</p>
                            </div>
                            <Switch
                              checked={selectedTemplate.show_remaining_balance}
                              onCheckedChange={(v) => setSelectedTemplate({ ...selectedTemplate, show_remaining_balance: v })}
                            />
                          </div>
                        )}
                        {selectedTemplate.type === "QUOTE" && (
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Zone de signature</Label>
                              <p className="text-xs text-muted-foreground">Ajoute "Bon pour accord" avec signature client</p>
                            </div>
                            <Switch
                              checked={selectedTemplate.signature_enabled}
                              onCheckedChange={(v) => setSelectedTemplate({ ...selectedTemplate, signature_enabled: v })}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="avance" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>CSS personnalisé</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedTemplate({ ...selectedTemplate, css: "" })}
                        >
                          Réinitialiser le CSS
                        </Button>
                      </div>
                      <Textarea
                        value={selectedTemplate.css || ""}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, css: e.target.value })}
                        rows={12}
                        className="font-mono text-sm"
                        placeholder=".header { background-color: #f0f0f0; }&#10;.total { font-weight: bold; }"
                      />
                      {selectedTemplate.css && (
                        <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                          <Label className="mb-2 block text-sm">Aperçu du style</Label>
                          <div className="p-4 bg-background rounded border">
                            <style dangerouslySetInnerHTML={{ __html: selectedTemplate.css }} />
                            <div className="header p-2">En-tête exemple</div>
                            <div className="content p-2">Contenu exemple avec du texte</div>
                            <div className="total p-2">Total: 1 234,56 €</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Annuler
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Prévisualiser
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Button variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")}>
          Tous
        </Button>
        <Button variant={filterType === "QUOTE" ? "default" : "outline"} onClick={() => setFilterType("QUOTE")}>
          Devis
        </Button>
        <Button variant={filterType === "INVOICE" ? "default" : "outline"} onClick={() => setFilterType("INVOICE")}>
          Factures
        </Button>
        <Button variant={filterType === "EMAIL" ? "default" : "outline"} onClick={() => setFilterType("EMAIL")}>
          Emails
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="p-4 space-y-3 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: template.main_color || "#3b82f6" }}
                >
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{template.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {template.type === "QUOTE" && "Devis"}
                      {template.type === "INVOICE" && "Facture"}
                      {template.type === "EMAIL" && "Email"}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{template.theme}</span>
                  </div>
                </div>
              </div>
              {template.is_default && (
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedTemplate(template);
                  setIsEditing(true);
                }}
              >
                Éditer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const duplicated = {
                    ...template,
                    id: "new",
                    name: `${template.name} (copie)`,
                    is_default: false,
                  };
                  setSelectedTemplate(duplicated);
                  setIsEditing(true);
                }}
              >
                Dupliquer
              </Button>
              {!template.is_default && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetDefault(template.id, template.type)}
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
        <div className="text-center py-12 text-muted-foreground">
          Aucun modèle trouvé. Créez-en un !
        </div>
      )}

      {/* Modal de prévisualisation */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévisualisation du modèle</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <TemplatePreview template={selectedTemplate} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
