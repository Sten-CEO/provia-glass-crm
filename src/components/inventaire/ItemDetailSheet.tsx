import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface ItemDetailSheetProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Movement {
  id: string;
  type: string;
  qty: number;
  date: string;
  scheduled_at?: string;
  status: string;
  source: string;
  ref_id?: string;
  ref_number?: string;
  note?: string;
}

interface ItemDetails {
  id: string;
  name: string;
  sku: string | null;
  qty_on_hand: number;
  qty_reserved: number;
  min_qty_alert: number;
  unit_price_ht: number;
  category: string | null;
  supplier_name: string | null;
}

export const ItemDetailSheet = ({ itemId, open, onOpenChange }: ItemDetailSheetProps) => {
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && itemId) {
      loadItemDetails();
    }
  }, [open, itemId]);

  const loadItemDetails = async () => {
    if (!itemId) return;
    
    setLoading(true);
    try {
      // Load item
      const { data: itemData, error: itemError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (itemError) throw itemError;
      setItem(itemData as ItemDetails);

      // Load movements
      const { data: movementsData, error: movementsError } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("item_id", itemId)
        .order("date", { ascending: false })
        .limit(50);

      if (movementsError) throw movementsError;
      setMovements(movementsData as Movement[]);
    } catch (error) {
      console.error("Error loading item details:", error);
    } finally {
      setLoading(false);
    }
  };

  const plannedReservations = movements.filter(
    m => m.status === "planned" && (m.type === "reserve" || m.type === "expected_out")
  );

  const plannedIncoming = movements.filter(
    m => m.status === "planned" && m.type === "in"
  );

  const history = movements.filter(m => m.status === "done" || m.status === "canceled");

  const qtyAvailable = (item?.qty_on_hand || 0) - (item?.qty_reserved || 0);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "in": return <TrendingUp className="h-4 w-4 text-success" />;
      case "out": return <TrendingDown className="h-4 w-4 text-destructive" />;
      case "reserve": return <Calendar className="h-4 w-4 text-warning" />;
      case "expected_out": return <Calendar className="h-4 w-4 text-warning" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case "in": return "Entrée";
      case "out": return "Sortie";
      case "reserve": return "Réservation";
      case "expected_out": return "Sortie prévue";
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done": return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Effectué</Badge>;
      case "planned": return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Prévu</Badge>;
      case "canceled": return <Badge variant="outline" className="bg-muted text-muted-foreground">Annulé</Badge>;
      default: return null;
    }
  };

  const handleNavigateToSource = (movement: Movement) => {
    if (!movement.ref_id) return;
    
    switch (movement.source) {
      case "devis":
        navigate(`/devis/${movement.ref_id}`);
        break;
      case "intervention":
        navigate(`/interventions/${movement.ref_id}`);
        break;
      case "achat":
        navigate(`/inventaire/achats/${movement.ref_id}`);
        break;
    }
    onOpenChange(false);
  };

  if (!item) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{item.name}</SheetTitle>
          {item.sku && (
            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
          )}
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Stock Summary */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Stock actuel
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">En stock</p>
                <p className="text-2xl font-bold text-success">{item.qty_on_hand}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Réservé</p>
                <p className="text-2xl font-bold text-warning">{item.qty_reserved}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponible</p>
                <p className="text-2xl font-bold text-primary">{qtyAvailable}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seuil d'alerte</p>
                <p className="text-2xl font-bold text-muted-foreground">{item.min_qty_alert}</p>
              </div>
            </div>
            
            {qtyAvailable < item.min_qty_alert && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Stock faible</p>
                  <p className="text-sm text-destructive/80">Le stock disponible est en dessous du seuil d'alerte</p>
                </div>
              </div>
            )}
          </div>

          {/* Planned Reservations */}
          {plannedReservations.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-warning" />
                Réservations planifiées ({plannedReservations.length})
              </h3>
              <div className="space-y-2">
                {plannedReservations.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-warning">-{movement.qty}</span>
                        {movement.scheduled_at && (
                          <span className="text-sm text-muted-foreground">
                            prévu le {format(new Date(movement.scheduled_at), "dd MMM yyyy", { locale: fr })}
                          </span>
                        )}
                      </div>
                      {movement.ref_number && (
                        <p className="text-sm text-muted-foreground truncate">
                          {movement.source === "devis" ? "Devis" : movement.source === "intervention" ? "Intervention" : movement.source} {movement.ref_number}
                        </p>
                      )}
                      {movement.note && (
                        <p className="text-xs text-muted-foreground mt-1">{movement.note}</p>
                      )}
                    </div>
                    {movement.ref_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleNavigateToSource(movement)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planned Incoming */}
          {plannedIncoming.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Arrivages prévus ({plannedIncoming.length})
              </h3>
              <div className="space-y-2">
                {plannedIncoming.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-success">+{movement.qty}</span>
                        {movement.scheduled_at && (
                          <span className="text-sm text-muted-foreground">
                            prévu le {format(new Date(movement.scheduled_at), "dd MMM yyyy", { locale: fr })}
                          </span>
                        )}
                      </div>
                      {movement.ref_number && (
                        <p className="text-sm text-muted-foreground truncate">
                          Achat {movement.ref_number}
                        </p>
                      )}
                    </div>
                    {movement.ref_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleNavigateToSource(movement)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-semibold">Historique des mouvements</h3>
            <Separator />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg"
                >
                  {getMovementIcon(movement.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {getMovementLabel(movement.type)}
                      </span>
                      <span className={movement.type === "in" ? "text-success" : "text-destructive"}>
                        {movement.type === "in" ? "+" : "-"}{movement.qty}
                      </span>
                      {getStatusBadge(movement.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(movement.date), "dd MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                    {movement.ref_number && (
                      <p className="text-sm text-muted-foreground">
                        {movement.source === "devis" ? "Devis" : movement.source === "intervention" ? "Intervention" : movement.source === "achat" ? "Achat" : movement.source} {movement.ref_number}
                      </p>
                    )}
                    {movement.note && (
                      <p className="text-xs text-muted-foreground mt-1">{movement.note}</p>
                    )}
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Aucun mouvement pour le moment
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
