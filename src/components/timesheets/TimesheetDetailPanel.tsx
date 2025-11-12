import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Edit, MapPin } from "lucide-react";

interface TimesheetBreak {
  id: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
}

interface TimesheetDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: {
    id: string;
    employee_id: string;
    client_id?: string;
    job_id?: string;
    date: string;
    start_at?: string;
    end_at?: string;
    hours: number;
    status: string;
    description?: string;
    travel_minutes?: number;
  } | null;
  employeeName?: string;
  clientName?: string;
  jobTitle?: string;
  breaks: TimesheetBreak[];
  onEdit: () => void;
}

export const TimesheetDetailPanel = ({
  open,
  onOpenChange,
  entry,
  employeeName,
  clientName,
  jobTitle,
  breaks,
  onEdit,
}: TimesheetDetailPanelProps) => {
  if (!entry) return null;

  const totalBreakMinutes = breaks.reduce((sum, b) => sum + b.duration_minutes, 0);
  const netHours = entry.hours - totalBreakMinutes / 60;

  const formatTime = (time?: string) => {
    if (!time) return "-";
    return time.substring(0, 5);
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m > 0 ? m.toString().padStart(2, "0") : ""}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
      submitted: { label: "Soumis", className: "bg-blue-500 text-white" },
      approved: { label: "Validé", className: "bg-success text-success-foreground" },
      rejected: { label: "Rejeté", className: "bg-destructive text-destructive-foreground" },
    };
    const config = statusMap[status] || statusMap.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Détail du pointage</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Informations générales */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-semibold uppercase tracking-wide text-foreground">
              Informations générales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Employé</p>
                <p className="text-lg font-medium">{employeeName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="text-lg font-medium">
                  {format(new Date(entry.date), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Intervention</p>
                <p className="text-lg font-medium">{jobTitle || "Temps administratif"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Client</p>
                <p className="text-lg font-medium">{clientName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Heure début</p>
                <p className="text-lg font-medium">{formatTime(entry.start_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Heure fin</p>
                <p className="text-lg font-medium">{formatTime(entry.end_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Durée totale</p>
                <p className="text-lg font-semibold text-primary">{formatDuration(entry.hours)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Heures nettes</p>
                <p className="text-lg font-semibold text-success">{formatDuration(netHours)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Statut</p>
                <div className="mt-1">{getStatusBadge(entry.status)}</div>
              </div>
            </div>
          </div>

          {/* Détails des pauses */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-semibold uppercase tracking-wide text-foreground">
              Détails des pauses
            </h3>

            {breaks.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">N° de pause</TableHead>
                      <TableHead className="font-semibold">Heure début</TableHead>
                      <TableHead className="font-semibold">Heure fin</TableHead>
                      <TableHead className="font-semibold text-right">Durée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breaks.map((brk, index) => (
                      <TableRow key={brk.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(brk.start_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(brk.end_at)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {brk.duration_minutes} min
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-orange-900">
                      → {breaks.length} pause{breaks.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-lg font-bold text-orange-700">
                      Durée totale : {totalBreakMinutes} min
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucune pause enregistrée pour ce shift
              </div>
            )}
          </div>

          {/* Autres détails */}
          {(entry.travel_minutes || entry.description) && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-semibold uppercase tracking-wide text-foreground">
                Autres détails
              </h3>
              <div className="space-y-3">
                {entry.travel_minutes && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Trajet enregistré</p>
                      <p className="font-medium">{entry.travel_minutes} minutes</p>
                    </div>
                  </div>
                )}
                {entry.description && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <p className="text-foreground">{entry.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Note sur géolocalisation */}
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <p className="text-sm text-warning-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              ⚠️ Fonctionnalité de géolocalisation disponible uniquement via l'application mobile
              Provia BASE (bientôt disponible)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
