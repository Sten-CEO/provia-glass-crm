import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Pause, CheckCircle, Camera, FileSignature, MapPin, Navigation, Clock } from "lucide-react";
import { toast } from "sonner";
import { JobPhotoCapture } from "@/components/employee/JobPhotoCapture";
import { SignatureCanvas } from "@/components/employee/SignatureCanvas";

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
  const [photos, setPhotos] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<any[]>([]);

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

      // Charger les photos
      const { data: photosData } = await supabase
        .from("intervention_files")
        .select("*")
        .eq("intervention_id", id)
        .eq("category", "photo");

      setPhotos(photosData || []);

      // Charger les signatures
      const { data: signaturesData } = await supabase
        .from("job_signatures")
        .select("*")
        .eq("job_id", id);

      setSignatures(signaturesData || []);

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
          start_at: new Date().toISOString(),
          timesheet_type: "job",
          status: "draft",
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
    } catch (error: any) {
      toast.error("Erreur de démarrage");
      console.error(error);
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
          end_at: new Date().toISOString(),
          status: "submitted",
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
    } catch (error: any) {
      toast.error("Erreur de pause");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const completeJob = async () => {
    setUpdating(true);

    try {
      // Terminer le timesheet si actif
      if (activeJobTimesheet) {
        const { error: tsError } = await supabase
          .from("timesheets_entries")
          .update({
            end_at: new Date().toISOString(),
            status: "submitted",
          })
          .eq("id", activeJobTimesheet.id);

        if (tsError) throw tsError;
      }

      // Mettre à jour le statut de l'intervention
      const { error: jobError } = await supabase
        .from("jobs")
        .update({ statut: "Terminée" })
        .eq("id", id);

      if (jobError) throw jobError;

      toast.success("Intervention terminée");
      loadData();
    } catch (error: any) {
      toast.error("Erreur de finalisation");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    if (!id) return;

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
    }
  };

  const openGPS = () => {
    if (!intervention?.adresse) {
      toast.error("Adresse non disponible");
      return;
    }
    
    const address = encodeURIComponent(intervention.adresse);
    const wazeUrl = `https://waze.com/ul?q=${address}`;
    window.open(wazeUrl, "_blank");
  };

  const handlePhotoUploaded = () => {
    loadData();
  };

  const handleSignatureSaved = () => {
    loadData();
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
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Intervention introuvable</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* En-tête */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{intervention.titre}</h2>
            <p className="text-sm text-muted-foreground">{intervention.client_nom}</p>
          </div>
          <Badge 
            className={
              intervention.statut === "En cours" ? "bg-yellow-500" :
              intervention.statut === "Terminée" ? "bg-green-500" :
              "bg-blue-500"
            }
          >
            {intervention.statut}
          </Badge>
        </div>

        {/* Info clés */}
        <div className="space-y-3">
          {intervention.date && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{intervention.date} {intervention.heure_debut && `à ${intervention.heure_debut}`}</span>
            </div>
          )}
          
          {intervention.adresse && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="line-clamp-2">{intervention.adresse}</p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1"
                  onClick={openGPS}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Ouvrir dans Waze
                </Button>
              </div>
            </div>
          )}

          {intervention.description && (
            <p className="text-sm text-muted-foreground border-t pt-3">
              {intervention.description}
            </p>
          )}
        </div>
      </Card>

      {/* Actions principales */}
      <Card className="p-4">
        <div className="flex gap-2">
          {!activeJobTimesheet && intervention.statut !== "Terminée" && (
            <Button
              onClick={startJob}
              disabled={updating}
              className="flex-1"
            >
              <Play className="mr-2 h-4 w-4" />
              Démarrer
            </Button>
          )}

          {activeJobTimesheet && (
            <Button
              onClick={pauseJob}
              disabled={updating}
              variant="outline"
              className="flex-1"
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}

          {intervention.statut !== "Terminée" && (
            <Button
              onClick={completeJob}
              disabled={updating}
              variant="default"
              className="flex-1"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Terminer
            </Button>
          )}
        </div>
      </Card>

      {/* Tabs avec photos et signature */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Infos</TabsTrigger>
          <TabsTrigger value="photos">
            <Camera className="h-4 w-4 mr-1" />
            Photos ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="signature">
            <FileSignature className="h-4 w-4 mr-1" />
            Signature
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Notes et observations</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Saisir vos observations..."
              className="min-h-[100px]"
            />
            <Button onClick={saveNotes} className="mt-2">
              Enregistrer les notes
            </Button>
          </Card>

          {/* Consommables et services */}
          {consumables.length > 0 && (
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Consommables</h4>
              <div className="space-y-2">
                {consumables.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.product_name}</span>
                    <span className="text-muted-foreground">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {services.length > 0 && (
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Services</h4>
              <div className="space-y-2">
                {services.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.description}</span>
                    <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Photos avant intervention</h3>
              {employeeId && (
                <JobPhotoCapture
                  jobId={id!}
                  employeeId={employeeId}
                  photoType="before"
                  onPhotoUploaded={handlePhotoUploaded}
                />
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Photos après intervention</h3>
              {employeeId && (
                <JobPhotoCapture
                  jobId={id!}
                  employeeId={employeeId}
                  photoType="after"
                  onPhotoUploaded={handlePhotoUploaded}
                />
              )}
            </div>

            {/* Liste des photos */}
            {photos.length > 0 && (
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Photos enregistrées</h4>
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.file_url}
                        alt={photo.file_name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Badge
                        className="absolute top-2 left-2"
                        variant={photo.photo_type === "before" ? "secondary" : "default"}
                      >
                        {photo.photo_type === "before" ? "Avant" : "Après"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="signature" className="space-y-4">
          {signatures.length > 0 ? (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Signature enregistrée</h3>
              <div className="space-y-2">
                <img
                  src={signatures[0].image_url}
                  alt="Signature client"
                  className="w-full border rounded-lg bg-white"
                />
                <div className="text-sm text-muted-foreground">
                  <p>Signé par: {signatures[0].signer_name}</p>
                  <p>Date: {new Date(signatures[0].signed_at).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <h3 className="font-semibold mb-2">Signature client</h3>
              {employeeId && (
                <SignatureCanvas
                  jobId={id!}
                  employeeId={employeeId}
                  onSignatureSaved={handleSignatureSaved}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
