import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Pause, StopCircle, Edit, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Employee {
  id: string;
  nom: string;
  email: string;
  role: string;
  phone: string;
}

interface TimesheetEvent {
  id: string;
  type: string;
  at: string;
  duration_minutes: number | null;
  job_id: string | null;
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [events, setEvents] = useState<TimesheetEvent[]>([]);

  useEffect(() => {
    if (id) {
      loadEmployee();
      loadEvents();

      const channel = supabase
        .channel('employee-events-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'timesheets_events',
          filter: `employee_id=eq.${id}`
        }, () => {
          loadEvents();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const loadEmployee = async () => {
    const { data } = await supabase
      .from('equipe')
      .select('*')
      .eq('id', id)
      .single();

    if (data) {
      setEmployee(data);
    }
  };

  const loadEvents = async () => {
    const { data } = await supabase
      .from('timesheets_events' as any)
      .select('*')
      .eq('employee_id', id)
      .order('at', { ascending: false })
      .limit(50);

    if (data) {
      setEvents(data as any);
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'start_day': return 'bg-green-500';
      case 'pause_start': return 'bg-orange-500';
      case 'pause_end': return 'bg-green-500';
      case 'stop_day': return 'bg-gray-500';
      case 'manual': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'start_day': return 'Début de journée';
      case 'pause_start': return 'Début de pause';
      case 'pause_end': return 'Fin de pause';
      case 'stop_day': return 'Fin de journée';
      case 'manual': return 'Entrée manuelle';
      default: return type;
    }
  };

  if (!employee) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {employee.nom.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{employee.nom}</h1>
              <p className="text-muted-foreground">{employee.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{employee.role}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Timeline de pointage</h2>
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-4">
              <div className={`w-3 h-3 rounded-full mt-2 ${getEventColor(event.type)}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getEventLabel(event.type)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(event.at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  {event.duration_minutes && (
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {event.duration_minutes} min
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
