import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, User, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface InterventionInfoBlockProps {
  plannedDate?: string;
  plannedStartTime?: string;
  plannedDurationMinutes?: number;
  assigneeName?: string;
  siteAddress?: string;
  autoCreateEnabled: boolean;
}

export const InterventionInfoBlock = ({
  plannedDate,
  plannedStartTime,
  plannedDurationMinutes,
  assigneeName,
  siteAddress,
  autoCreateEnabled
}: InterventionInfoBlockProps) => {
  // Only show if at least planned date is provided
  if (!plannedDate) return null;

  const hasCompleteInfo = plannedDate && plannedStartTime && assigneeName;

  return (
    <Card className="glass-card border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Informations d'intervention proposées
          {autoCreateEnabled && (
            <Badge variant="outline" className="ml-auto bg-success/10 text-success border-success/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Création auto activée
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plannedDate && (
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Date prévue</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(plannedDate), "EEEE dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
          )}

          {plannedStartTime && (
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Heure de début</p>
                <p className="text-sm text-muted-foreground">
                  {plannedStartTime}
                  {plannedDurationMinutes && ` (${Math.floor(plannedDurationMinutes / 60)}h${plannedDurationMinutes % 60 > 0 ? (plannedDurationMinutes % 60) + 'min' : ''})`}
                </p>
              </div>
            </div>
          )}

          {assigneeName && (
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <User className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Technicien assigné</p>
                <p className="text-sm text-muted-foreground truncate">{assigneeName}</p>
              </div>
            </div>
          )}

          {siteAddress && (
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Lieu d'intervention</p>
                <p className="text-sm text-muted-foreground">{siteAddress}</p>
              </div>
            </div>
          )}
        </div>

        {autoCreateEnabled && (
          <div className="flex items-start gap-2 p-3 bg-success/10 border border-success/20 rounded-lg mt-4">
            <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-success">Création automatique activée</p>
              <p className="text-xs text-success/80 mt-1">
                Une intervention sera automatiquement créée et planifiée lorsque ce devis sera accepté ou signé
              </p>
            </div>
          </div>
        )}

        {!hasCompleteInfo && (
          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg mt-4">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">Informations incomplètes</p>
              <p className="text-xs text-warning/80 mt-1">
                Veuillez renseigner la date, l'heure et le technicien pour une planification optimale
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
