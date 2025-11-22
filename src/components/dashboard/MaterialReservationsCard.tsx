import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

interface MaterialReservation {
  id: string;
  qty_reserved: number;
  scheduled_start: string;
  scheduled_end: string;
  material: {
    name: string;
  };
  job: {
    id: string;
    titre: string;
    employe_nom: string;
    date?: string | null;
    heure_debut?: string | null;
    heure_fin?: string | null;
  };
}

export const MaterialReservationsCard = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<MaterialReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { companyId } = useCurrentCompany();

  const parseDateSafe = (input?: string | null) => {
    if (!input) return null as Date | null;
    const d1 = new Date(input);
    if (!isNaN(d1.getTime())) return d1;
    const withZ = input.endsWith('Z') ? input : input + 'Z';
    const d2 = new Date(withZ);
    if (!isNaN(d2.getTime())) return d2;
    return null;
  };

  useEffect(() => {
    if (!companyId) return;

    loadReservations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("material_reservations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "material_reservations",
        },
        () => {
          loadReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const loadReservations = async () => {
    if (!companyId) return;

    try {
      // Explicit company_id filter for multi-tenant isolation
      const { data, error } = await supabase
        .from("material_reservations")
        .select(
          `
          id,
          qty_reserved,
          scheduled_start,
          scheduled_end,
          material:inventory_items!material_reservations_material_id_fkey(name),
          job:jobs!material_reservations_job_id_fkey(id, titre, employe_nom, date, heure_debut, heure_fin)
        `
        )
        .eq("company_id", companyId)
        .in("status", ["planned", "active"])
        .gte("scheduled_start", new Date().toISOString())
        .order("scheduled_start", { ascending: true })
        .limit(5);

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error("Error loading material reservations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Only count valid reservations (with material AND job linked)
  const validReservations = reservations.filter(r => r.material && r.job);
  const totalReservations = validReservations.length;

  if (totalReservations === 0) {
    return null;
  }

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Matériels réservés à venir
        </CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary mb-4">
          {totalReservations} réservation{totalReservations > 1 ? "s" : ""}
        </div>
        <div className="space-y-3">
          {validReservations.map((reservation) => {
            const start = parseDateSafe(reservation.scheduled_start);
            const end = parseDateSafe(reservation.scheduled_end);
            const hasJobTimes = Boolean(reservation.job?.date && reservation.job?.heure_debut && reservation.job?.heure_fin);
            const dateLabel = hasJobTimes
              ? format(new Date(`${reservation.job.date}T00:00:00`), "d MMM yyyy", { locale: fr })
              : (start ? format(start, "d MMM yyyy", { locale: fr }) : "Date à confirmer");
            const timeLabel = hasJobTimes
              ? `${(reservation.job.heure_debut || '').slice(0,5)}–${(reservation.job.heure_fin || '').slice(0,5)}`
              : (start && end ? `${format(start, "HH:mm")}–${format(end, "HH:mm")}` : "Horaire à confirmer");
            return (
              <div
                key={reservation.id}
                className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() =>
                  navigate(`/interventions/${reservation.job.id}/report`)
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {reservation.qty_reserved}x {reservation.material.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {reservation.job.titre}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{reservation.job.employe_nom}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {dateLabel} · {timeLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
