import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfWeek, endOfWeek, isToday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Intervention {
  id: string;
  titre: string;
  client_nom: string;
  adresse: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  statut: string;
}

export const EmployeePlanning = () => {
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { locale: fr }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlanning();
  }, [currentWeekStart]);

  const loadPlanning = async () => {
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

      const weekEnd = endOfWeek(currentWeekStart, { locale: fr });

      const { data: assignments } = await supabase
        .from("intervention_assignments")
        .select(`
          intervention_id,
          jobs (*)
        `)
        .eq("employee_id", employee.id);

      const jobs = assignments?.map((a: any) => a.jobs).filter((j) => {
        if (!j) return false;
        const jobDate = new Date(j.date);
        return jobDate >= currentWeekStart && jobDate <= weekEnd;
      }) || [];

      setInterventions(jobs);

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
    return interventions.filter((job) => 
      isSameDay(new Date(job.date), date)
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

  if (loading) {
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
                onClick={() => navigate(`/employee/interventions/${job.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{job.titre}</h4>
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
                      <span>
                        {job.heure_debut}
                        {job.heure_fin && ` - ${job.heure_fin}`}
                      </span>
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
    </div>
  );
};
