// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Play, Square, Bell, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { useEmployee } from "@/contexts/EmployeeContext";

interface Intervention {
  id: string;
  titre: string;
  client_nom: string;
  adresse: string;
  date: string;
  heure_debut: string;
  statut: string;
}

interface DayTimesheet {
  id: string;
  start_at: string;
  end_at: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { employeeId, employeeName, loading: contextLoading } = useEmployee();
  const [todayJobs, setTodayJobs] = useState<Intervention[]>([]);
  const [activeTimesheet, setActiveTimesheet] = useState<DayTimesheet | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const firstName = employeeName.split(" ")[0] || "Employé";

  useEffect(() => {
    if (!contextLoading && employeeId) {
      loadDashboardData();
      setupRealtimeSubscriptions();
    }
  }, [contextLoading, employeeId]);

  const setupRealtimeSubscriptions = () => {
    if (!employeeId) return;

    const channel = supabase
      .channel('employee-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intervention_assignments',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload) => {
          console.log('Assignment changed:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('Job changed:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timesheets_entries',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload) => {
          console.log('Timesheet changed:', payload);
          loadDashboardData();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadDashboardData = async () => {
    if (!employeeId) return;

    try {
      // 1) Récupère les affectations formelles
      const { data: assignments, error: assignError } = await supabase
        .from("intervention_assignments")
        .select("intervention_id")
        .eq("employee_id", employeeId);

      if (assignError) console.warn(assignError);

      let jobs: any[] = [];

      if (assignments && assignments.length > 0) {
        const interventionIds = assignments.map(a => a.intervention_id);
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .in("id", interventionIds)
          .not("statut", "in", '("Brouillon","À planifier")');
        if (error) throw error;
        jobs = data || [];
      } else {
        // 2) Fallback: utilise les champs du job si la table d'affectation est vide
        const { data: jobsByArray } = await supabase
          .from("jobs")
          .select("*")
          .contains("assigned_employee_ids", [employeeId])
          .not("statut", "in", '("Brouillon","À planifier")');

        const { data: jobsByLegacy } = await supabase
          .from("jobs")
          .select("*")
          .eq("employe_id", employeeId)
          .not("statut", "in", '("Brouillon","À planifier")');

        const merged = [...(jobsByArray || []), ...(jobsByLegacy || [])];
        // déduplique par id
        const map = new Map(merged.map(j => [j.id, j]));
        jobs = Array.from(map.values());
      }

      // Filtrer pour aujourd'hui uniquement
      const todayJobs = jobs.filter((j) => j && isToday(new Date(j.date)));
      
      setTodayJobs(todayJobs.map(j => ({
        id: j.id,
        titre: j.titre,
        client_nom: j.client_nom,
        adresse: j.adresse,
        date: j.date,
        heure_debut: j.heure_debut,
        statut: j.statut
      })));

      // Charger le timesheet actif du jour
      const { data: timesheetRow } = await supabase
        .from("timesheets_entries" as any)
        .select("id,start_at,end_at")
        .eq("employee_id", employeeId)
        .eq("timesheet_type", "day")
        .eq("date", format(new Date(), "yyyy-MM-dd"))
        .is("end_at", null)
        .maybeSingle();

      // @ts-ignore - avoid deep type instantiation from Supabase types here
      setActiveTimesheet((timesheetRow as any) ?? null);

      // Charger les notifications non lues (simplified)
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      setNotifications(notifs || []);

    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDay = async () => {
    if (!employeeId) return;

    try {
      const { error } = await supabase
        .from("timesheets_entries")
        .insert({
          employee_id: employeeId,
          date: format(new Date(), "yyyy-MM-dd"),
          start_at: format(new Date(), "HH:mm:ss"),
          timesheet_type: "day",
          status: "draft"
        });

      if (error) throw error;
      
      toast.success("Journée démarrée");
      loadDashboardData();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du démarrage");
    }
  };

  const handleEndDay = async () => {
    if (!activeTimesheet) return;

    try {
      const { error } = await supabase
        .from("timesheets_entries")
        .update({
          end_at: format(new Date(), "HH:mm:ss"),
          status: "submitted"
        })
        .eq("id", activeTimesheet.id);

      if (error) throw error;
      
      toast.success("Journée terminée");
      setActiveTimesheet(null);
    } catch (error) {
      console.error(error);
      toast.error("Erreur");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "À faire": return "bg-blue-100 text-blue-800";
      case "En cours": return "bg-yellow-100 text-yellow-800";
      case "Terminée": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Bonjour {firstName}</h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* Timesheet du jour */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold">Pointage</span>
          </div>
          
          {!activeTimesheet ? (
            <Button onClick={handleStartDay} className="gap-2">
              <Play className="h-4 w-4" />
              Démarrer journée
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                En cours
              </Badge>
              <Button onClick={handleEndDay} variant="destructive" size="sm" className="gap-2">
                <Square className="h-4 w-4" />
                Terminer
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-5 w-5 text-primary" />
            <span className="font-semibold">Notifications</span>
            <Badge variant="secondary">{notifications.length}</Badge>
          </div>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div key={notif.id} className="text-sm p-2 bg-muted/50 rounded">
                <div className="font-medium">{notif.title}</div>
                {notif.message && (
                  <div className="text-muted-foreground">{notif.message}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Jobs du jour */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Interventions du jour</h2>
          <Badge variant="secondary">{todayJobs.length}</Badge>
        </div>

        {todayJobs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucune intervention prévue aujourd'hui
          </Card>
        ) : (
          <div className="space-y-3">
            {todayJobs.map((job) => (
              <Card
                key={job.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/employee/jobs/${job.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{job.titre}</h3>
                  <Badge className={getStatusColor(job.statut)}>
                    {job.statut}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {job.client_nom}
                </p>

                <div className="space-y-2 text-sm">
                  {job.heure_debut && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{job.heure_debut}</span>
                    </div>
                  )}

                  {job.adresse && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{job.adresse}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-20"
          onClick={() => navigate("/employee/jobs")}
        >
          <div className="text-center">
            <Calendar className="h-6 w-6 mx-auto mb-1" />
            <div className="text-sm">Tous les jobs</div>
          </div>
        </Button>
        <Button 
          variant="outline" 
          className="h-20"
          onClick={() => navigate("/employee/planning")}
        >
          <div className="text-center">
            <Clock className="h-6 w-6 mx-auto mb-1" />
            <div className="text-sm">Planning</div>
          </div>
        </Button>
      </div>
    </div>
  );
};
