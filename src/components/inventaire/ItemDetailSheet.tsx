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
import { toast } from "sonner";

// Safe date parser that tolerates null/invalid inputs and missing 'Z'
const parseDateSafe = (input?: string | null) => {
  if (!input) return null as Date | null;
  const d1 = new Date(input);
  if (!isNaN(d1.getTime())) return d1;
  const withZ = input.endsWith('Z') ? input : input + 'Z';
  const d2 = new Date(withZ);
  if (!isNaN(d2.getTime())) return d2;
  return null;
};


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
  type: string;
}

interface MaterialReservation {
  id: string;
  qty_reserved: number;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  job: {
    id: string;
    titre: string;
    client_nom: string;
    intervention_number: string;
    date: string;
    heure_debut: string;
    heure_fin: string;
  } | null;
}

export const ItemDetailSheet = ({ itemId, open, onOpenChange }: ItemDetailSheetProps) => {
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [materialReservations, setMaterialReservations] = useState<MaterialReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && itemId) {
      loadItemDetails();

      // Realtime subscriptions for inventory updates
      const itemsChannel = supabase
        .channel(`inventory_item_${itemId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory_items',
            filter: `id=eq.${itemId}`
          },
          () => {
            loadItemDetails();
          }
        )
        .subscribe();

      const movementsChannel = supabase
        .channel(`inventory_movements_${itemId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory_movements',
            filter: `item_id=eq.${itemId}`
          },
          () => {
            loadItemDetails();
          }
        )
        .subscribe();

      const reservationsChannel = supabase
        .channel(`inventory_reservations_${itemId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory_reservations',
            filter: `inventory_item_id=eq.${itemId}`
          },
          () => {
            loadItemDetails();
          }
        )
        .subscribe();

      // Material reservations channel
      const materialReservationsChannel = supabase
        .channel(`material_reservations_${itemId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'material_reservations',
            filter: `material_id=eq.${itemId}`
          },
          () => {
            loadItemDetails();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(itemsChannel);
        supabase.removeChannel(movementsChannel);
        supabase.removeChannel(reservationsChannel);
        supabase.removeChannel(materialReservationsChannel);
      };
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

      // Load material reservations if this is a material
      if (itemData?.type === 'materiel') {
        const { data: reservationsData, error: reservationsError } = await supabase
          .from("material_reservations")
          .select(`
            *,
            job:jobs(id, titre, client_nom, intervention_number, date, heure_debut, heure_fin)
          `)
          .eq("material_id", itemId)
          .in("status", ["planned", "active"])
          .gte("scheduled_end", new Date().toISOString())
          .order("scheduled_start", { ascending: true });

        if (!reservationsError && reservationsData) {
          setMaterialReservations(reservationsData);
        }
      }
    } catch (error) {
      console.error("Error loading item details:", error);
    } finally {
      setLoading(false);
    }
  };

  const plannedConsumables = movements.filter(
    m => m.status === "planned" && m.type === "expected_out"
  );

  const plannedReservations = movements.filter(
    m => m.status === "planned" && m.type === "reserve"
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

  const handleNavigateToSource = async (movement: Movement) => {
    if (!movement.ref_id) return;
    
    try {
      switch (movement.source) {
        case "devis":
          const { data: devis, error: devisError } = await supabase
            .from("devis")
            .select("id")
            .eq("id", movement.ref_id)
            .maybeSingle();
          
          if (devisError || !devis) {
            toast.error("Ce devis n'existe plus");
            return;
          }
          navigate(`/devis/${movement.ref_id}`);
          break;
          
        case "intervention":
          const { data: intervention, error: interventionError } = await supabase
            .from("jobs")
            .select("id")
            .eq("id", movement.ref_id)
            .maybeSingle();
          
          if (interventionError || !intervention) {
            toast.error("Cette intervention n'existe plus");
            return;
          }
          navigate(`/interventions/${movement.ref_id}/report`);
          break;
          
        case "achat":
          navigate(`/inventaire/achats/${movement.ref_id}`);
          break;
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error navigating to source:", error);
      toast.error("Erreur lors de la navigation");
    }
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

          {/* Planned Consumables (À prévoir) - SEULEMENT pour consommables */}
          {item.type === 'consommable' && plannedConsumables.length > 0 && (
            <div className="glass-card p-4 space-y-3 border-l-4 border-orange-500">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                À prévoir - Consommables ({plannedConsumables.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Ces consommables seront déduits du stock lors de la finalisation des interventions
              </p>
              <div className="space-y-2">
                {plannedConsumables.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-orange-600">-{movement.qty}</span>
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

          {/* Material Reservations (Réservations à venir) - SEULEMENT pour matériels */}
          {item.type === 'materiel' && materialReservations.length > 0 && (
            <div className="glass-card p-4 space-y-3 border-l-4 border-blue-500">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Réservations à venir - Matériels ({materialReservations.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Ces matériels sont réservés sur des créneaux horaires et seront restitués après utilisation (pas de déduction de stock)
              </p>
              <div className="space-y-2">
                {materialReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors cursor-pointer"
                    onClick={() => {
                      if (reservation.job?.id) {
                        navigate(`/interventions/${reservation.job.id}/report`);
                        onOpenChange(false);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-600">🔒 {reservation.qty_reserved}x</span>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                          {reservation.status === 'planned' ? 'Planifié' : 'Actif'}
                        </Badge>
                      </div>
                      {reservation.job && (
                        <>
                          <p className="text-sm font-medium truncate">
                            {reservation.job.titre}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            Client: {reservation.job.client_nom}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {parseDateSafe(reservation.scheduled_start)
                                ? format(parseDateSafe(reservation.scheduled_start)!, "dd MMM yyyy", { locale: fr })
                                : "Date à confirmer"}
                            </span>
                            <span>•</span>
                            <span>
                              {parseDateSafe(reservation.scheduled_start) && parseDateSafe(reservation.scheduled_end)
                                ? `${format(parseDateSafe(reservation.scheduled_start)!, "HH:mm", { locale: fr })} - ${format(parseDateSafe(reservation.scheduled_end)!, "HH:mm", { locale: fr })}`
                                : "Horaire à confirmer"}
                            </span>
                          </div>
                          {reservation.job.intervention_number && (
                            <p className="text-xs text-muted-foreground">
                              Intervention {reservation.job.intervention_number}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planned Incoming */}
          {plannedIncoming.length > 0 && (
            <div className="glass-card p-4 space-y-3 border-l-4 border-green-500">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Entrées prévues ({plannedIncoming.length})
              </h3>
              <div className="space-y-2">
                {plannedIncoming.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-600">+{movement.qty}</span>
                        {movement.scheduled_at && (
                          <span className="text-sm text-muted-foreground">
                            prévu le {format(new Date(movement.scheduled_at), "dd MMM yyyy", { locale: fr })}
                          </span>
                        )}
                      </div>
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

          <Separator />

          {/* Movement History */}
          <div className="space-y-3">
            <h3 className="font-semibold">Historique des mouvements</h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun mouvement enregistré</p>
            ) : (
              <div className="space-y-2">
                {history.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getMovementIcon(movement.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{getMovementLabel(movement.type)}</span>
                          <span className={`font-semibold ${
                            movement.type === "in" ? "text-success" : "text-destructive"
                          }`}>
                            {movement.type === "in" ? "+" : ""}{movement.qty}
                          </span>
                          {getStatusBadge(movement.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(movement.date), "dd MMM yyyy HH:mm", { locale: fr })}
                        </p>
                        {movement.ref_number && (
                          <p className="text-sm text-muted-foreground truncate">
                            {movement.source === "devis" ? "Devis" : movement.source === "intervention" ? "Intervention" : movement.source} {movement.ref_number}
                          </p>
                        )}
                        {movement.note && (
                          <p className="text-xs text-muted-foreground mt-1">{movement.note}</p>
                        )}
                      </div>
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
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
