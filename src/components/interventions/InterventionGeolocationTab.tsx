import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Smartphone } from "lucide-react";

interface InterventionGeolocationTabProps {
  job: any;
}

export function InterventionGeolocationTab({ job }: InterventionGeolocationTabProps) {
  const hasGPS = job.location_gps && (job.location_gps.lat || job.location_gps.latitude);

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Géolocalisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Adresse du chantier */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              📍 Adresse du chantier
            </h3>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm">{job.adresse || job.clients?.adresse || "Adresse non renseignée"}</p>
              <p className="text-sm text-muted-foreground">{job.lieu || job.clients?.ville || ""}</p>
            </div>
          </div>

          {/* GPS Data if available */}
          {hasGPS ? (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                📍 Position enregistrée
              </h3>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">
                  Latitude: {job.location_gps.lat || job.location_gps.latitude}
                </p>
                <p className="text-sm">
                  Longitude: {job.location_gps.lng || job.location_gps.longitude}
                </p>
                {job.location_gps.checkInTime && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Arrivée: {new Date(job.location_gps.checkInTime).toLocaleString("fr-FR")}
                  </p>
                )}
                {job.location_gps.checkOutTime && (
                  <p className="text-sm text-muted-foreground">
                    Départ: {new Date(job.location_gps.checkOutTime).toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8">
              <div className="text-center space-y-4">
                <Smartphone className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-semibold text-lg mb-2">
                    ⚠️ Fonctionnalité disponible via l'application mobile
                  </p>
                  <p className="text-sm text-muted-foreground">
                    La géolocalisation en temps réel, le pointage d'arrivée/départ et le suivi de trajet
                    seront disponibles via l'application mobile Provia BASE.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">
                    📱 Application mobile en cours de développement
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Future features preview */}
          <Card className="bg-muted/20 border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Fonctionnalités à venir</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Carte interactive avec position en temps réel</p>
              <p>✓ Pointage automatique arrivée/départ sur site</p>
              <p>✓ Calcul de trajet et durée de déplacement</p>
              <p>✓ Historique des positions du technicien</p>
              <p>✓ Alertes de proximité client</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
