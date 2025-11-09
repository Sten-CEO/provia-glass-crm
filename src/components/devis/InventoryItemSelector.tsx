import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  type: string;
  unit_price_ht: number;
  qty_on_hand: number;
  qty_reserved: number;
}

interface Props {
  onSelect: (item: InventoryItem) => void;
  trigger?: React.ReactNode;
}

export const InventoryItemSelector = ({ onSelect, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("consommable");

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open]);

  const loadItems = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("id, name, sku, type, unit_price_ht, qty_on_hand, qty_reserved")
      .order("name");
    
    if (data) setItems(data as InventoryItem[]);
  };

  const filteredItems = items.filter(
    (item) =>
      item.type === activeTab &&
      (search === "" || item.name.toLowerCase().includes(search.toLowerCase()) || item.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (item: InventoryItem) => {
    onSelect(item);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Package className="h-4 w-4 mr-2" />
            Articles d'inventaire
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sélectionner un article d'inventaire</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un article..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="consommable">Consommables</TabsTrigger>
              <TabsTrigger value="materiel">Matériels</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredItems.map((item) => {
                const available = item.qty_on_hand - (item.qty_reserved || 0);
                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{item.name}</span>
                          {item.sku && <Badge variant="outline">{item.sku}</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Prix: {item.unit_price_ht.toFixed(2)} € HT</span>
                          <span>
                            Stock: {item.qty_on_hand} (
                            <span className={available <= 0 ? "text-destructive" : "text-green-500"}>
                              {available} dispo
                            </span>
                            )
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun article trouvé
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
