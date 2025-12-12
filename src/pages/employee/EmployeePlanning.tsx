import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfWeek, endOfWeek, isToday, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useEmployee } from "@/contexts/EmployeeContext";

interface Job {
  id: string;
  title: string;
  client_name: string;
  address: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export const EmployeePlanning = () => {
  const navigate = useNavigate();
  const { employeeId, companyId, loading: contextLoading } = useEmployee();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { locale: fr }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contextLoading && employeeId) {
      loadPlanning();
      setupRealtimeSubscriptions();
    }
  }, [currentWeekStart, contextLoading, employeeId]);

  const setupRealtimeSubscriptions = () => {
    if (!employeeId) return;

    const channel = supabase
      .channel('employee-planning-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intervention_assignments',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload) => {
          loadPlanning();
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
          loadPlanning();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadPlanning = async () => {
    if (!employeeId || !companyId) return;

    try {
      const weekEnd = endOfWeek(currentWeekStart, { locale: fr });

      // 1) Affectations formelles
      const { data: assignments } = await supabase
        .from("intervention_assignments")
        .select("intervention_id")
        .eq("employee_id", employeeId);

      let jobsRaw: any[] = [];

      if (assignments && assignments.length > 0) {
        const interventionIds = assignments.map(a => a.intervention_id);
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("company_id", companyId)
          .in("id", interventionIds)
          .not("statut", "in", '("Brouillon","À planifier")');
        if (error) throw error;
        jobsRaw = data || [];
      } else {
        // 2) Fallback sur assigned_employee_ids et employe_id
        const { data: byArray } = await supabase
          .from("jobs")
          .select("*")
          .eq("company_id", companyId)
          .contains("assigned_employee_ids", [employeeId])
          .not("statut", "in", '("Brouillon","À planifier")');

        const { data: byLegacy } = await supabase
          .from("jobs")
          .select("*")
          .eq("company_id", companyId)
          .eq("employe_id", employeeId)
          .not("statut", "in", '("Brouillon","À planifier")');

        const merged = [...(byArray || []), ...(byLegacy || [])];
        const map = new Map(merged.map(j => [j.id, j]));
        jobsRaw = Array.from(map.values());
      }

      // Filtrer pour la semaine en cours et mapper
      const weekJobs = jobsRaw.filter((j) => {
        if (!j) return false;
        const jobDate = parseISO(j.date);
        return jobDate >= currentWeekStart && jobDate <= weekEnd;
      }).map(j => ({
        id: j.id,
        title: j.titre,
        client_name: j.client_nom,
        address: j.adresse,
        date: j.date,
        start_time: j.heure_debut || "",
        end_time: j.heure_fin || "",
        status: j.statut
      }));

      setJobs(weekJobs);

    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement du planning");
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  };

  const getJobsForDate = (date: Date) => {
    return jobs.filter((job) => 
      isSameDay(parseISO(job.date), date)
    );
  };

  const previousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const nextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { locale: fr }));
    setSelectedDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "À faire": return "bg-blue-100 text-blue-800";
      case "En cours": return "bg-yellow-100 text-yellow-800";
      case "Terminée": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  const weekDays = getWeekDays();
  const selectedJobs = getJobsForDate(selectedDate);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header avec navigation semaine */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={previousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            {format(currentWeekStart, "MMMM yyyy", { locale: fr })}
          </h2>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
        </div>

        <Button variant="outline" size="icon" onClick={nextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Vue semaine */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayJobs = getJobsForDate(day);
          const isSelected = isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`p-2 rounded-lg border text-center transition-all ${
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : today
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              }`}
            >
              <div className="text-xs font-medium">
                {format(day, "EEE", { locale: fr })}
              </div>
              <div className="text-lg font-bold">
                {format(day, "d")}
              </div>
              {dayJobs.length > 0 && (
                <div className="mt-1">
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {dayJobs.length}
                  </Badge>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Jobs du jour sélectionné */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          {format(selectedDate, "EEEE d MMMM", { locale: fr })}
        </h3>

        {selectedJobs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucune intervention prévue ce jour
          </Card>
        ) : (
          <div className="space-y-3">
            {selectedJobs.map((job) => (
              <Card
                key={job.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/employee/jobs/${job.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{job.title}</h4>
                  <Badge className={getStatusColor(job.status)}>
                    {job.status}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {job.client_name}
                </p>

                <div className="space-y-2 text-sm">
                  {job.start_time && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {job.start_time}
                        {job.end_time && ` - ${job.end_time}`}
                      </span>
                    </div>
                  )}

                  {job.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{job.address}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
