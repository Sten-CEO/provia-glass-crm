import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AgendaEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  location: string | null;
  type: string;
  status: string;
}

interface ClientPlanningSectionProps {
  clientId: string;
}

export const ClientPlanningSection = ({ clientId }: ClientPlanningSectionProps) => {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();

    const channel = supabase
      .channel('client-planning')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agenda_events'
      }, () => {
        loadEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const loadEvents = async () => {
    const { data: eventClients } = await supabase
      .from('event_clients')
      .select('event_id')
      .eq('client_id', clientId);

    if (!eventClients || eventClients.length === 0) {
      setEvents([]);
      return;
    }

    const eventIds = eventClients.map(ec => ec.event_id);

    // Charger TOUS les événements (passés et futurs) triés du plus récent au plus ancien
    const { data } = await supabase
      .from('agenda_events')
      .select('*')
      .in('id', eventIds)
      .order('start_at', { ascending: false });

    if (data) {
      setEvents(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Planning du client</h3>
        <Button variant="outline" size="sm" onClick={() => navigate('/planning')}>
          Voir le planning complet
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground">
          Aucun événement planifié pour ce client
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <Card
              key={event.id}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/agenda/${event.id}`)}
            >
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{event.title}</p>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      event.status === 'à venir' && "bg-blue-500/10 text-blue-500",
                      event.status === 'en cours' && "bg-yellow-500/10 text-yellow-500",
                      event.status === 'terminé' && "bg-green-500/10 text-green-500",
                      event.status === 'annulé' && "bg-red-500/10 text-red-500"
                    )}>
                      {event.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(event.start_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
