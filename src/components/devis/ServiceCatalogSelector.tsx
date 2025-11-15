import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  default_price_ht: number;
  default_tva_rate: number;
  is_active: boolean;
}

interface ServiceCatalogSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (service: ServiceItem) => void;
}

export function ServiceCatalogSelector({ open, onClose, onSelect }: ServiceCatalogSelectorProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadServices();
    }
  }, [open]);

  useEffect(() => {
    if (search) {
      const filtered = services.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description?.toLowerCase().includes(search.toLowerCase()) ||
          s.category?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services);
    }
  }, [search, services]);

  const loadServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_items")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("Erreur lors du chargement des services");
      console.error(error);
    } else {
      setServices(data || []);
      setFilteredServices(data || []);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sélectionner un service du catalogue</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Aucun service trouvé" : "Aucun service dans le catalogue"}
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{service.name}</h4>
                      {service.category && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                          {service.category}
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="font-medium text-primary">
                        {service.default_price_ht.toFixed(2)} € HT / {service.unit}
                      </span>
                      <span className="text-muted-foreground">TVA: {service.default_tva_rate}%</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onSelect(service);
                      onClose();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
