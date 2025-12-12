import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { useEmployee } from "@/contexts/EmployeeContext";
import { format, isToday, isThisWeek, parseISO } from "date-fns";

interface Job {
  id: string;
  title: string;
  client_name: string;
  address: string;
  date: string;
  start_time: string;
  status: string;
  description: string;
}

type FilterType = "today" | "week" | "all";

export const EmployeeJobs = () => {
  const navigate = useNavigate();
  const { employeeId, companyId, loading: contextLoading } = useEmployee();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    if (!contextLoading && employeeId) {
      loadJobs();
      setupRealtimeSubscriptions();
    }
  }, [contextLoading, employeeId]);

  const setupRealtimeSubscriptions = () => {
    if (!employeeId) return;

    const channel = supabase
      .channel('employee-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intervention_assignments',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload) => {
          loadJobs();
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
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadJobs = async () => {
    if (!employeeId || !companyId) return;

    try {
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
          .not("statut", "in", '("Brouillon","À planifier")')
          .order("date", { ascending: false });
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

      const mapped = jobsRaw.map(j => ({
        id: j.id,
        title: j.titre,
        client_name: j.client_nom,
        address: j.adresse,
        date: j.date,
        start_time: j.heure_debut || "",
        status: j.statut,
        description: j.description || ""
      }));

      setJobs(mapped);
    } catch (error: any) {
      toast.error("Erreur de chargement des jobs");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredJobs = () => {
    if (!jobs) return [];
    
    switch (filter) {
      case "today":
        return jobs.filter(j => isToday(parseISO(j.date)));
      case "week":
        return jobs.filter(j => isThisWeek(parseISO(j.date), { weekStartsOn: 1 }));
      default:
        return jobs;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "À faire": return "bg-blue-100 text-blue-800";
      case "En cours": return "bg-yellow-100 text-yellow-800";
      case "Terminée": return "bg-green-100 text-green-800";
      case "Annulée": return "bg-red-100 text-red-800";
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

  const filteredJobs = getFilteredJobs();

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Mes Jobs</h2>
        <Badge variant="secondary">{filteredJobs.length} jobs</Badge>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={filter === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("today")}
        >
          Aujourd'hui
        </Button>
        <Button
          variant={filter === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("week")}
        >
          Cette semaine
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Tous
        </Button>
      </div>

      {filteredJobs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          {filter === "today" && "Aucun job prévu aujourd'hui"}
          {filter === "week" && "Aucun job prévu cette semaine"}
          {filter === "all" && "Aucun job assigné"}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Card
              key={job.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/employee/jobs/${job.id}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{job.title}</h3>
                <Badge className={getStatusColor(job.status)}>
                  {job.status}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {job.client_name}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(parseISO(job.date), "dd/MM/yyyy")}</span>
                </div>

                {job.start_time && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{job.start_time}</span>
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
  );
};