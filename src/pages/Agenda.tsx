import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AgendaEvent {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  type: string;
  status: string;
  attendees: string[];
  location: string;
}

export default function Agenda() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [view, setView] = useState<'day' | 'week'>('day');

  useEffect(() => {
    loadEvents();

    const channel = supabase
      .channel('agenda-changes')
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
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from('agenda_events')
      .select('*')
      .order('start_at', { ascending: true });

    if (data) {
      setEvents(data);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'rdv': return 'bg-blue-500';
      case 'demo': return 'bg-purple-500';
      case 'appel': return 'bg-green-500';
      case 'autre': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'rdv': return 'Rendez-vous';
      case 'demo': return 'Démo';
      case 'appel': return 'Appel';
      case 'autre': return 'Autre';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">
            Gérez vos rendez-vous et événements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('day')}
          >
            Jour
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            Semaine
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau rendez-vous
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className={`w-1 h-full rounded ${getEventTypeColor(event.type)}`} />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </div>
                  <Badge variant="outline">{getEventTypeLabel(event.type)}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(event.start_at), 'PPP', { locale: fr })}
                  </div>
                  <div>
                    {format(new Date(event.start_at), 'HH:mm')} - {format(new Date(event.end_at), 'HH:mm')}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {event.attendees.length} participant(s)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
