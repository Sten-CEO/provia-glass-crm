import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, CheckCircle, Camera, FileSignature, MapPin, Navigation, Clock, Timer } from "lucide-react";
import { toast } from "sonner";
import { JobPhotoCapture } from "@/components/employee/JobPhotoCapture";
import { SignatureCanvas } from "@/components/employee/SignatureCanvas";
import { CompletionResultDialog } from "@/components/employee/CompletionResultDialog";

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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [checklist, setChecklist] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    
    const channel = supabase
      .channel(`job-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Job detail updated:', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Timer auto
  useEffect(() => {
    let interval: any;
    if (activeJobTimesheet?.start_at) {
      interval = setInterval(() => {
        const start = new Date(activeJobTimesheet.start_at).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeJobTimesheet]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

      const { data: job, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setIntervention(job);
      setNotes(job.notes || "");
      setChecklist(Array.isArray(job.checklist) ? job.checklist : []);

      const { data: timesheet } = await supabase
        .from("timesheets_entries")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("job_id", id)
        .eq("timesheet_type", "job")
        .is("end_at", null)
        .maybeSingle();

      setActiveJobTimesheet(timesheet);

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

      const { data: photosData } = await supabase
        .from("intervention_files")
        .select("*")
        .eq("intervention_id", id)
        .eq("category", "photo");

      setPhotos(photosData || []);

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
      const now = new Date();
      const { error: tsError } = await supabase
        .from("timesheets_entries")
        .insert({
          employee_id: employeeId,
          job_id: id,
          date: now.toISOString().split('T')[0],
          start_at: now.toISOString(),
          timesheet_type: "job",
          status: "draft",
          hours: 0,
        });

      if (tsError) throw tsError;

      const { error: jobError } = await supabase
        .from("jobs")
        .update({ statut: "En cours" })
        .eq("id", id);

      if (jobError) throw jobError;

      toast.success("Intervention démarrée - chronomètre lancé");
      loadData();
    } catch (error: any) {
      toast.error("Erreur de démarrage");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const completeJob = () => {
    setShowResultDialog(true);
  };

  const handleCompletionResult = async (result: "Terminée" | "Échouée" | "Reportée") => {
    setUpdating(true);
    setShowResultDialog(false);

    try {
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

      const { error: jobError } = await supabase
        .from("jobs")
        .update({ statut: result })
        .eq("id", id);

      if (jobError) throw jobError;

      toast.success(`Intervention ${result.toLowerCase()}`);
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

  const toggleChecklistItem = async (itemId: string) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);

    try {
      const { error } = await supabase
        .from("jobs")
        .update({ checklist: updated as any })
        .eq("id", id);

      if (error) throw error;
      toast.success("Checklist mise à jour");
    } catch (error) {
      console.error(error);
      toast.error("Erreur de mise à jour");
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
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Intervention introuvable</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
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
              intervention.statut === "Échouée" ? "bg-red-500" :
              intervention.statut === "Reportée" ? "bg-orange-500" :
              "bg-blue-500"
            }
          >
            {intervention.statut}
          </Badge>
        </div>

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

      {/* Actions & Timer */}
      <Card className="p-4">
        {activeJobTimesheet && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
              <Timer className="h-4 w-4" />
              <span>Temps écoulé</span>
            </div>
            <div className="text-3xl font-mono font-bold">{formatTime(elapsedTime)}</div>
          </div>
        )}

        <div className="flex gap-2">
          {!activeJobTimesheet && intervention.statut !== "Terminée" && intervention.statut !== "Échouée" && intervention.statut !== "Reportée" && (
            <Button
              onClick={startJob}
              disabled={updating}
              className="flex-1"
            >
              <Play className="mr-2 h-4 w-4" />
              Je commence l'intervention
            </Button>
          )}

          {activeJobTimesheet && (
            <Button
              onClick={completeJob}
              disabled={updating}
              variant="default"
              className="flex-1"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Fin de l'intervention
            </Button>
          )}
        </div>
      </Card>

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
          {/* Checklist */}
          {checklist.length > 0 && (
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Checklist</h4>
              <div className="space-y-2">
                {checklist.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                      {item.label}
                    </span>
                    {item.required && (
                      <Badge variant="destructive" className="ml-auto text-xs">Obligatoire</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Consommables */}
          {consumables.length > 0 && (
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Consommables prévus</h4>
              <div className="space-y-2">
                {consumables.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm border-b pb-1">
                    <span>{item.product_name}</span>
                    <span className="text-muted-foreground">Quantité: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Matériaux */}
          {services.length > 0 && (
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Services / Matériels</h4>
              <div className="space-y-2">
                {services.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm border-b pb-1">
                    <span>{item.description}</span>
                    <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Notes */}
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
                  onPhotoUploaded={loadData}
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
                  onPhotoUploaded={loadData}
                />
              )}
            </div>

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
              <h4 className="font-semibold mb-3">Signature client</h4>
              <img
                src={signatures[0].image_url}
                alt="Signature"
                className="w-full border rounded"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Signé par: {signatures[0].signer_name}
              </p>
            </Card>
          ) : (
            employeeId && (
              <SignatureCanvas
                jobId={id!}
                employeeId={employeeId}
                onSignatureSaved={loadData}
              />
            )
          )}
        </TabsContent>
      </Tabs>

      <CompletionResultDialog
        open={showResultDialog}
        onResult={handleCompletionResult}
      />
    </div>
  );
};
