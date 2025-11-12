import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Play, Pause, CheckCircle, Camera, FileSignature, MapPin, Navigation, Clock, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const EmployeeInterventionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intervention, setIntervention] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [activeJobTimesheet, setActiveJobTimesheet] = useState<any>(null);
  const [consumables, setConsumables] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/employee/login");
        return;
      }

      const { data: employee } = await supabase
        .from("equipe")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!employee) return;
      setEmployeeId(employee.id);

      // Charger l'intervention
      const { data: job, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setIntervention(job);
      setNotes(job.notes || "");

      // Charger le timesheet actif pour ce job
      const { data: timesheet } = await supabase
        .from("timesheets_entries")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("job_id", id)
        .eq("timesheet_type", "job")
        .is("end_at", null)
        .maybeSingle();

      setActiveJobTimesheet(timesheet);

      // Charger les consommables et services
      const { data: cons } = await supabase
        .from("intervention_consumables")
        .select("*")
        .eq("intervention_id", id);

      const { data: serv } = await supabase
        .from("intervention_services")
        .select("*")
        .eq("intervention_id", id);

      setConsumables(cons || []);
      setServices(serv || []);

    } catch (error: any) {
      toast.error("Erreur de chargement");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startJob = async () => {
    if (!employeeId) return;
    setUpdating(true);

    try {
      // Créer le timesheet job
      const { error: tsError } = await supabase
        .from("timesheets_entries")
        .insert({
          employee_id: employeeId,
          job_id: id,
          date: format(new Date(), "yyyy-MM-dd"),
          start_at: format(new Date(), "HH:mm:ss"),
          timesheet_type: "job",
          status: "draft"
        });

      if (tsError) throw tsError;

      // Mettre à jour le statut de l'intervention
      const { error: jobError } = await supabase
        .from("jobs")
        .update({ statut: "En cours" })
        .eq("id", id);

      if (jobError) throw jobError;

      toast.success("Intervention démarrée");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du démarrage");
    } finally {
      setUpdating(false);
    }
  };

  const pauseJob = async () => {
    if (!activeJobTimesheet) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from("timesheets_entries")
        .update({
          end_at: format(new Date(), "HH:mm:ss"),
          status: "submitted"
        })
        .eq("id", activeJobTimesheet.id);

      if (error) throw error;

      const { error: jobError } = await supabase
        .from("jobs")
        .update({ statut: "À faire" })
        .eq("id", id);

      if (jobError) throw jobError;

      toast.success("Intervention mise en pause");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erreur");
    } finally {
      setUpdating(false);
    }
  };

  const completeJob = async () => {
    if (!activeJobTimesheet) return;
    setUpdating(true);

    try {
      // Terminer le timesheet
      const { error: tsError } = await supabase
        .from("timesheets_entries")
        .update({
          end_at: format(new Date(), "HH:mm:ss"),
          status: "submitted"
        })
        .eq("id", activeJobTimesheet.id);

      if (tsError) throw tsError;

      // Marquer l'intervention comme terminée
      const { error: jobError } = await supabase
        .from("jobs")
        .update({ 
          statut: "Terminée",
          completed_at: new Date().toISOString()
        })
        .eq("id", id);

      if (jobError) throw jobError;

      // TODO: Décrémenter les consommables et libérer les matériaux (via edge function)
      
      toast.success("Intervention terminée");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erreur");
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ notes })
        .eq("id", id);

      if (error) throw error;
      toast.success("Notes enregistrées");
    } catch (error: any) {
      toast.error("Erreur d'enregistrement");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const openGPS = (app: "waze" | "google") => {
    if (!intervention?.adresse) {
      toast.error("Pas d'adresse disponible");
      return;
    }

    const address = encodeURIComponent(intervention.adresse);
    
    if (app === "waze") {
      window.open(`https://waze.com/ul?q=${address}`, "_blank");
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <Card className="p-8 text-center text-muted-foreground">
          Intervention introuvable
        </Card>
      </div>
    );
  }

  const canStart = intervention.statut === "À faire" && !activeJobTimesheet;
  const canPause = intervention.statut === "En cours" && activeJobTimesheet;
  const canComplete = intervention.statut === "En cours" && activeJobTimesheet;

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* En-tête intervention */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{intervention.titre}</h2>
            <p className="text-muted-foreground">{intervention.client_nom}</p>
          </div>
          <Badge className={
            intervention.statut === "À faire" ? "bg-blue-100 text-blue-800" :
            intervention.statut === "En cours" ? "bg-yellow-100 text-yellow-800" :
            "bg-green-100 text-green-800"
          }>
            {intervention.statut}
          </Badge>
        </div>

        {intervention.date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(intervention.date), "EEEE d MMMM yyyy", { locale: fr })}
              {intervention.heure_debut && ` à ${intervention.heure_debut}`}
            </span>
          </div>
        )}

        {intervention.adresse && (
          <div className="p-3 bg-muted/50 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4" />
              <p className="text-sm font-medium">Adresse</p>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{intervention.adresse}</p>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => openGPS("waze")}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Waze
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => openGPS("google")}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Google Maps
              </Button>
            </div>
          </div>
        )}

        {intervention.description && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-1">Description</p>
            <p className="text-sm text-muted-foreground">{intervention.description}</p>
          </div>
        )}

        {/* Actions principales */}
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <Button
              onClick={startJob}
              disabled={updating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Démarrer
            </Button>
          )}

          {canPause && (
            <Button
              onClick={pauseJob}
              disabled={updating}
              variant="outline"
              className="flex-1"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}

          {canComplete && (
            <Button
              onClick={completeJob}
              disabled={updating}
              className="flex-1 bg-primary"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Terminer
            </Button>
          )}
        </div>
      </Card>

      {/* Consommables et matériaux */}
      {(consumables.length > 0 || services.length > 0) && (
        <Card className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Éléments de l'intervention
          </h3>

          {consumables.length > 0 && (
            <>
              <p className="text-sm font-medium mb-2">Consommables/Matériaux</p>
              <div className="space-y-2 mb-4">
                {consumables.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>{item.product_name}</span>
                    <span className="text-muted-foreground">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {services.length > 0 && (
            <>
              <p className="text-sm font-medium mb-2">Services</p>
              <div className="space-y-2">
                {services.map((service) => (
                  <div key={service.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>{service.description}</span>
                    <span className="text-muted-foreground">
                      {service.quantity} {service.unit}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Notes */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">Notes d'intervention</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ajoutez vos observations..."
          className="mb-3 min-h-32"
        />
        <Button onClick={saveNotes} disabled={updating} className="w-full">
          Enregistrer les notes
        </Button>
      </Card>

      {/* Actions supplémentaires */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">Actions</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Camera className="h-4 w-4 mr-2" />
            Prendre des photos
            <Badge variant="secondary" className="ml-auto">Bientôt</Badge>
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <FileSignature className="h-4 w-4 mr-2" />
            Signature client
            <Badge variant="secondary" className="ml-auto">Bientôt</Badge>
          </Button>
        </div>
      </Card>
    </div>
  );
};
