import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, MapPin, Users, Clock } from "lucide-react";
import { format, isToday, isTomorrow, addDays } from "date-fns";
import { fr } from "date-fns/locale";

export const AgendaColumn = () => {
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();

    const channel = supabase
      .channel('agenda-widget-changes')
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
    // Update statuses first based on dates
    await supabase.rpc('update_agenda_event_statuses');

    const now = new Date();
    const tomorrow = addDays(now, 1);
    const nextWeek = addDays(now, 7);

    const { data } = await supabase
      .from('agenda_events' as any)
      .select('*')
      .gte('start_at', now.toISOString())
      .lte('start_at', nextWeek.toISOString())
      .order('start_at');

    if (data) {
      setTodayEvents(data.filter((e: any) => isToday(new Date(e.start_at))));
      setTomorrowEvents(data.filter((e: any) => isTomorrow(new Date(e.start_at))));
      setUpcomingEvents(data.filter((e: any) => !isToday(new Date(e.start_at)) && !isTomorrow(new Date(e.start_at))));
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
      case 'rdv': return 'RDV';
      case 'demo': return 'Démo';
      case 'appel': return 'Appel';
      case 'autre': return 'Autre';
      default: return type;
    }
  };

  const EventCard = ({ event }: { event: any }) => (
    <div className="p-4 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium">{event.title}</h4>
        <Badge variant="outline" className={getEventTypeColor(event.type)}>
          {getEventTypeLabel(event.type)}
        </Badge>
      </div>
      {event.description && (
        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(event.start_at), 'HH:mm')} - {format(new Date(event.end_at), 'HH:mm')}
        </div>
        {event.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {event.location}
          </div>
        )}
        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {event.attendees.length}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Agenda
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/agenda')}>
            Tout voir
          </Button>
          <Button size="sm" onClick={() => navigate('/agenda')}>
            <Plus className="h-4 w-4 mr-1" />
            Nouveau
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Aujourd'hui */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-primary mb-3">
            Aujourd'hui
          </h3>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun événement</p>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Demain */}
        {tomorrowEvents.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-blue-600 mb-3">
              Demain
            </h3>
            <div className="space-y-3">
              {tomorrowEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Prochains jours */}
        {upcomingEvents.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Prochainement
            </h3>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.start_at), 'EEEE d MMMM', { locale: fr })}
                  </p>
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
