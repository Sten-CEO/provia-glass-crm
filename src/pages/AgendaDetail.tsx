import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Users, Clock, Edit, Copy, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

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

export default function AgendaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AgendaEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    const { data, error } = await supabase
      .from('agenda_events' as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading event:', error);
      toast.error("Erreur lors du chargement de l'événement");
      navigate('/agenda');
    } else if (data) {
      setEvent(data as any);
    }
    setLoading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'à_venir':
        return <Badge className="bg-blue-100 text-blue-700">À venir</Badge>;
      case 'aujourd\'hui':
        return <Badge className="bg-green-100 text-green-700">Aujourd'hui</Badge>;
      case 'passé':
        return <Badge className="bg-gray-100 text-gray-700">Passé</Badge>;
      case 'annulé':
        return <Badge className="bg-red-100 text-red-700">Annulé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleDuplicate = async () => {
    if (!event) return;

    const { error } = await supabase
      .from('agenda_events' as any)
      .insert({
        title: `${event.title} (copie)`,
        description: event.description,
        start_at: event.start_at,
        end_at: event.end_at,
        type: event.type,
        status: 'à_venir',
        attendees: event.attendees,
        location: event.location,
      });

    if (error) {
      toast.error("Erreur lors de la duplication");
    } else {
      toast.success("Événement dupliqué avec succès");
      navigate('/agenda');
    }
  };

  const handleCancel = async () => {
    if (!event) return;

    const { error } = await supabase
      .from('agenda_events' as any)
      .update({ status: 'annulé' })
      .eq('id', id);

    if (error) {
      toast.error("Erreur lors de l'annulation");
    } else {
      toast.success("Événement annulé");
      loadEvent();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Événement non trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/agenda')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">Détails de l'événement</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/agenda/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Dupliquer
          </Button>
          {event.status !== 'annulé' && (
            <Button variant="destructive" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Informations générales</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Type</p>
              <Badge variant="outline">{getEventTypeLabel(event.type)}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Statut</p>
              {getStatusBadge(event.status)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{event.description || 'Aucune description'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Date et heure</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {format(new Date(event.start_at), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Horaires</p>
                <p className="text-sm font-medium">
                  {format(new Date(event.start_at), 'HH:mm')} - {format(new Date(event.end_at), 'HH:mm')}
                </p>
              </div>
            </div>
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Lieu</p>
                  <p className="text-sm font-medium">{event.location}</p>
                </div>
              </div>
            )}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Participants</p>
                  <div className="space-y-1 mt-1">
                    {event.attendees.map((attendee, i) => (
                      <p key={i} className="text-sm">{attendee}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
