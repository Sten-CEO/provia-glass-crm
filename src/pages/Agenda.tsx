import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, MapPin, Users, MoreVertical, Edit, Copy, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { NewEventDialog } from "@/components/agenda/NewEventDialog";
import { EditEventDialog } from "@/components/agenda/EditEventDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

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
      .from('agenda_events' as any)
      .select('*')
      .order('start_at', { ascending: true });

    if (data) {
      setEvents(data as any);
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

  const handleEdit = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEventId(eventId);
    setEditDialogOpen(true);
  };

  const handleDuplicate = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const { error } = await supabase
      .from('agenda_events')
      .insert({
        title: `${event.title} (copie)`,
        description: event.description,
        start_at: event.start_at,
        end_at: event.end_at,
        type: event.type,
        status: 'à venir',
        attendees: event.attendees,
        location: event.location,
      });

    if (error) {
      toast.error("Erreur lors de la duplication");
    } else {
      toast.success("Événement dupliqué avec succès");
      loadEvents();
    }
  };

  const handleDeleteClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    const { error } = await supabase
      .from('agenda_events')
      .delete()
      .eq('id', eventToDelete);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Événement supprimé avec succès");
      loadEvents();
    }
    setDeleteDialogOpen(false);
    setEventToDelete(null);
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
          <NewEventDialog onEventCreated={loadEvents} />
        </div>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card 
            key={event.id} 
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(`/agenda/${event.id}`)}
          >
            <div className="flex items-start gap-4">
              <div className={`w-1 h-full rounded ${getEventTypeColor(event.type)}`} />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getEventTypeLabel(event.type)}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleEdit(event.id, e)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDuplicate(event.id, e)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleDeleteClick(event.id, e)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

      {selectedEventId && (
        <EditEventDialog
          eventId={selectedEventId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onEventUpdated={loadEvents}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
