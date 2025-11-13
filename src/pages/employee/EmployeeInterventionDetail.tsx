import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [quotes, setQuotes] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

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
    if (activeJobTimesheet?.start_at && activeJobTimesheet?.date) {
      interval = setInterval(() => {
        // Combiner date et heure pour avoir un timestamp complet
        const startDateTime = new Date(`${activeJobTimesheet.date}T${activeJobTimesheet.start_at}`);
        const now = Date.now();
        setElapsedTime(Math.floor((now - startDateTime.getTime()) / 1000));
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

      // Charger les devis liés à cette intervention
      let allQuotes: any[] = [];

      // Cas 1: Devis directement lié via jobs.quote_id
      if (job.quote_id) {
        const { data: linkedQuote } = await supabase
          .from("devis")
          .select("*")
          .eq("id", job.quote_id)
          .single();
        
        if (linkedQuote) {
          allQuotes.push(linkedQuote);
        }
      }

      // Cas 2: Devis convertis en cette intervention via converted_to_job_id
      const { data: convertedQuotes } = await supabase
        .from("devis")
        .select("*")
        .eq("converted_to_job_id", id)
        .order("created_at", { ascending: false });

      if (convertedQuotes) {
        // Éviter les doublons si le devis est présent dans les deux cas
        const existingIds = new Set(allQuotes.map(q => q.id));
        convertedQuotes.forEach(q => {
          if (!existingIds.has(q.id)) {
            allQuotes.push(q);
          }
        });
      }

      setQuotes(allQuotes);

      // Charger les 5 derniers paiements du client
      if (job.client_id) {
        const { data: clientInvoices } = await supabase
          .from("factures")
          .select("numero")
          .eq("client_id", job.client_id);

        if (clientInvoices && clientInvoices.length > 0) {
          const invoiceNumbers = clientInvoices.map(inv => inv.numero);
          
          const { data: paymentsData } = await supabase
            .from("paiements")
            .select("*")
            .in("facture_numero", invoiceNumbers)
            .order("date_paiement", { ascending: false })
            .limit(5);

          setRecentPayments(paymentsData || []);
        }
      }

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
      const timeString = now.toTimeString().split(' ')[0]; // Format HH:MM:SS
      
      const { error: tsError } = await supabase
        .from("timesheets_entries")
        .insert({
          employee_id: employeeId,
          job_id: id,
          date: now.toISOString().split('T')[0],
          start_at: timeString,
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
        const timeString = new Date().toTimeString().split(' ')[0]; // Format HH:MM:SS
        
        const { error: tsError } = await supabase
          .from("timesheets_entries")
          .update({
            end_at: timeString,
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">Infos</TabsTrigger>
          <TabsTrigger value="photos">
            <Camera className="h-4 w-4 mr-1" />
            Photos ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="signature">
            <FileSignature className="h-4 w-4 mr-1" />
            Signature
          </TabsTrigger>
          <TabsTrigger value="quotes">Devis</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
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

        <TabsContent value="quotes" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-3">Devis liés à cette intervention</h4>
            {quotes.length > 0 ? (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <Dialog key={quote.id}>
                    <DialogTrigger asChild>
                      <div className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{quote.numero}</p>
                            <p className="text-sm text-muted-foreground">
                              {quote.title || "Sans titre"}
                            </p>
                          </div>
                          <Badge
                            className={
                              quote.statut === "Accepté" || quote.statut === "Signé"
                                ? "bg-green-500"
                                : quote.statut === "Envoyé"
                                ? "bg-blue-500"
                                : "bg-gray-500"
                            }
                          >
                            {quote.statut}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Montant: {quote.total_ttc?.toFixed(2) || '0.00'}€
                          </span>
                          <span className="text-xs text-primary">Cliquer pour voir le détail</span>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Détail du devis {quote.numero}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Client</p>
                            <p className="font-medium">{quote.client_nom}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Statut</p>
                            <Badge>{quote.statut}</Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Date d'émission</p>
                            <p className="font-medium">{quote.issued_at || '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Date d'expiration</p>
                            <p className="font-medium">{quote.expiry_date || '-'}</p>
                          </div>
                        </div>

                        {quote.title && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Titre</p>
                            <p className="font-medium">{quote.title}</p>
                          </div>
                        )}

                        {quote.message_client && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Message client</p>
                            <p className="text-sm">{quote.message_client}</p>
                          </div>
                        )}

                        <div>
                          <h4 className="font-semibold mb-2">Lignes du devis</h4>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="text-left p-2">Désignation</th>
                                  <th className="text-right p-2">Qté</th>
                                  <th className="text-right p-2">Prix HT</th>
                                  <th className="text-right p-2">Total HT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.isArray(quote.lignes) && quote.lignes.map((ligne: any, idx: number) => (
                                  <tr key={idx} className="border-t">
                                    <td className="p-2">
                                      <p className="font-medium">{ligne.name || ligne.description}</p>
                                      {ligne.description && ligne.name && (
                                        <p className="text-xs text-muted-foreground">{ligne.description}</p>
                                      )}
                                    </td>
                                    <td className="text-right p-2">{ligne.qty || ligne.quantity || 0}</td>
                                    <td className="text-right p-2">{(ligne.unit_price_ht || 0).toFixed(2)}€</td>
                                    <td className="text-right p-2 font-medium">
                                      {((ligne.qty || ligne.quantity || 0) * (ligne.unit_price_ht || 0)).toFixed(2)}€
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="border-t pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total HT</span>
                            <span className="font-medium">{quote.total_ht?.toFixed(2) || '0.00'}€</span>
                          </div>
                          {quote.remise > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Remise</span>
                              <span className="font-medium text-orange-600">-{quote.remise?.toFixed(2)}€</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">TVA</span>
                            <span className="font-medium">{((quote.total_ttc || 0) - (quote.total_ht || 0)).toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total TTC</span>
                            <span>{quote.total_ttc?.toFixed(2) || '0.00'}€</span>
                          </div>
                        </div>

                        {quote.pdf_url && (
                          <Button
                            className="w-full"
                            onClick={() => window.open(quote.pdf_url, "_blank")}
                          >
                            Ouvrir le PDF complet
                          </Button>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun devis lié à cette intervention
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-3">Paiements récents du client</h4>
            {recentPayments.length > 0 ? (
              <div className="space-y-2">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{payment.facture_numero}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.date_paiement).toLocaleDateString("fr-FR")} · {payment.methode}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {payment.montant}€
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun paiement récent pour ce client
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <CompletionResultDialog
        open={showResultDialog}
        onResult={handleCompletionResult}
      />
    </div>
  );
};
