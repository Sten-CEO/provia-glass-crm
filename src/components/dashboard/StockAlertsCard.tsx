import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const StockAlertsCard = () => {
  const navigate = useNavigate();
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockAlerts();

    const channel = supabase
      .channel("stock-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, loadStockAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_movements" }, loadStockAlerts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStockAlerts = async () => {
    try {
      // Get items with qty_reserved
      const { data: items, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");

      if (error) throw error;

      // Calculate disponible for each item
      const itemsWithStock = items?.map(item => {
        const reserved = item.qty_reserved || 0;
        const disponible = item.qty_on_hand - reserved;
        
        return {
          ...item,
          reserved,
          disponible,
          isLowStock: disponible <= (item.min_qty_alert || 0) && item.min_qty_alert > 0,
        };
      }) || [];

      // Filter low stock items
      const alerts = itemsWithStock.filter(item => item.isLowStock);
      setLowStockItems(alerts);
    } catch (error) {
      console.error("Error loading stock alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (lowStockItems.length === 0) return null;

  return (
    <div 
      className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-destructive"
      onClick={() => navigate("/inventaire/consommables?filter=low")}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold uppercase tracking-wide">Alertes Stock</h3>
            <p className="text-sm text-muted-foreground">
              {lowStockItems.length} article{lowStockItems.length > 1 ? "s" : ""} sous le seuil
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {lowStockItems.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <Badge variant="destructive" className="text-xs">
              {item.disponible} disponible
            </Badge>
          </div>
        ))}
        {lowStockItems.length > 3 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{lowStockItems.length - 3} autre{lowStockItems.length - 3 > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
};
