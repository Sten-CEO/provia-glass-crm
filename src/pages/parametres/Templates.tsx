import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save, Trash2, FileText, Star } from "lucide-react";

interface Template {
  id: string;
  type: string;
  name: string;
  is_default: boolean;
  content_html: string;
  header_html: string | null;
  footer_html: string | null;
  css: string | null;
}

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
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

    const { error } = selectedTemplate.id === "new"
      ? await supabase.from("doc_templates").insert({
          type: selectedTemplate.type,
          name: selectedTemplate.name,
          content_html: selectedTemplate.content_html,
          header_html: selectedTemplate.header_html,
          footer_html: selectedTemplate.footer_html,
          css: selectedTemplate.css,
          is_default: selectedTemplate.is_default,
        })
      : await supabase.from("doc_templates").update({
          name: selectedTemplate.name,
          content_html: selectedTemplate.content_html,
          header_html: selectedTemplate.header_html,
          footer_html: selectedTemplate.footer_html,
          css: selectedTemplate.css,
          is_default: selectedTemplate.is_default,
        }).eq("id", selectedTemplate.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Modèle sauvegardé");
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
                content_html: "",
                header_html: "",
                footer_html: "",
                css: "",
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom</Label>
                    <Input
                      value={selectedTemplate.name}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
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

                <Tabs defaultValue="body">
                  <TabsList>
                    <TabsTrigger value="body">Corps</TabsTrigger>
                    <TabsTrigger value="header">En-tête</TabsTrigger>
                    <TabsTrigger value="footer">Pied de page</TabsTrigger>
                    <TabsTrigger value="css">CSS</TabsTrigger>
                  </TabsList>
                  <TabsContent value="body">
                    <Label>HTML du corps</Label>
                    <Textarea
                      value={selectedTemplate.content_html}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, content_html: e.target.value })}
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </TabsContent>
                  <TabsContent value="header">
                    <Label>HTML de l'en-tête</Label>
                    <Textarea
                      value={selectedTemplate.header_html || ""}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, header_html: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </TabsContent>
                  <TabsContent value="footer">
                    <Label>HTML du pied de page</Label>
                    <Textarea
                      value={selectedTemplate.footer_html || ""}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, footer_html: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </TabsContent>
                  <TabsContent value="css">
                    <Label>CSS personnalisé</Label>
                    <Textarea
                      value={selectedTemplate.css || ""}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, css: e.target.value })}
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </Button>
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
          <Card key={template.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">{template.name}</h3>
                  <p className="text-xs text-muted-foreground">{template.type}</p>
                </div>
              </div>
              {template.is_default && (
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              )}
            </div>
            <div className="flex gap-2">
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
    </div>
  );
};

export default Templates;
