import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const AgendaWidget = () => {
  const [events, setEvents] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadTodayEvents();
  }, []);

  const loadTodayEvents = async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data } = await supabase
      .from('agenda_events')
      .select('*')
      .gte('start_at', today.toISOString())
      .lte('start_at', tomorrow.toISOString())
      .order('start_at');

    if (data) setEvents(data);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agenda
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/agenda')}>
            Tout voir
          </Button>
          <Button size="sm" onClick={() => navigate('/agenda')}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement aujourd'hui</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{event.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.start_at), 'HH:mm', { locale: fr })} - {format(new Date(event.end_at), 'HH:mm', { locale: fr })}
                </p>
              </div>
              <Badge variant="outline">{event.type}</Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
