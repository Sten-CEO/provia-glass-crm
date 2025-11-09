import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save, Trash2, Package } from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  default_price_ht: number;
  default_tva_rate: number;
  category: string | null;
  is_active: boolean;
}

const UNITS = ["unité", "h", "j", "m²", "m", "ml", "forfait", "lot"];
const TVA_RATES = [0, 5.5, 10, 20];

const ServiceCatalog = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const { data, error } = await supabase
      .from("service_items")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Erreur lors du chargement");
      return;
    }
    setServices(data || []);
  };

  const handleSave = async () => {
    if (!selectedService) return;

    const { error } = selectedService.id === "new"
      ? await supabase.from("service_items").insert({
          name: selectedService.name,
          description: selectedService.description,
          unit: selectedService.unit,
          default_price_ht: selectedService.default_price_ht,
          default_tva_rate: selectedService.default_tva_rate,
          category: selectedService.category,
          is_active: selectedService.is_active,
        })
      : await supabase.from("service_items").update({
          name: selectedService.name,
          description: selectedService.description,
          unit: selectedService.unit,
          default_price_ht: selectedService.default_price_ht,
          default_tva_rate: selectedService.default_tva_rate,
          category: selectedService.category,
          is_active: selectedService.is_active,
        }).eq("id", selectedService.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Service sauvegardé");
      setIsEditing(false);
      loadServices();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("service_items").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Service supprimé");
      loadServices();
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catalogue de services</h1>
          <p className="text-muted-foreground mt-1">Services prédéfinis réutilisables dans les devis</p>
        </div>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedService({
                id: "new",
                name: "",
                description: "",
                unit: "unité",
                default_price_ht: 0,
                default_tva_rate: 20,
                category: "",
                is_active: true,
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedService?.id === "new" ? "Nouveau service" : "Éditer le service"}</DialogTitle>
            </DialogHeader>
            {selectedService && (
              <div className="space-y-4">
                <div>
                  <Label>Nom du service</Label>
                  <Input
                    value={selectedService.name}
                    onChange={(e) => setSelectedService({ ...selectedService, name: e.target.value })}
                    placeholder="Ex: Installation électrique"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={selectedService.description || ""}
                    onChange={(e) => setSelectedService({ ...selectedService, description: e.target.value })}
                    rows={3}
                    placeholder="Description détaillée du service"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Unité</Label>
                    <Select
                      value={selectedService.unit}
                      onValueChange={(v) => setSelectedService({ ...selectedService, unit: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Catégorie</Label>
                    <Input
                      value={selectedService.category || ""}
                      onChange={(e) => setSelectedService({ ...selectedService, category: e.target.value })}
                      placeholder="Ex: Électricité"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prix unitaire HT (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={selectedService.default_price_ht}
                      onChange={(e) => setSelectedService({ ...selectedService, default_price_ht: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Taux de TVA (%)</Label>
                    <Select
                      value={selectedService.default_tva_rate.toString()}
                      onValueChange={(v) => setSelectedService({ ...selectedService, default_tva_rate: parseFloat(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TVA_RATES.map(t => (
                          <SelectItem key={t} value={t.toString()}>{t}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={selectedService.is_active}
                    onCheckedChange={(checked) => setSelectedService({ ...selectedService, is_active: checked })}
                  />
                  <Label>Service actif</Label>
                </div>
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

      <Input
        placeholder="Rechercher un service..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <Card key={service.id} className={`p-4 space-y-3 ${!service.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  {service.category && (
                    <p className="text-xs text-muted-foreground">{service.category}</p>
                  )}
                </div>
              </div>
            </div>
            {service.description && (
              <p className="text-sm text-muted-foreground">{service.description}</p>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{service.unit}</span>
              <span className="font-semibold">{service.default_price_ht.toFixed(2)} € HT</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedService(service);
                  setIsEditing(true);
                }}
              >
                Éditer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(service.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun service trouvé. Créez-en un !
        </div>
      )}
    </div>
  );
};

export default ServiceCatalog;
