import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface EditEventDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated?: () => void;
}

export const EditEventDialog = ({ eventId, open, onOpenChange, onEventUpdated }: EditEventDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    start_at: '',
    end_at: '',
    location: '',
    description: '',
    type: 'rdv',
  });

  useEffect(() => {
    if (open && eventId) {
      loadEvent();
    }
  }, [open, eventId]);

  const loadEvent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agenda_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement de l'événement");
      onOpenChange(false);
    } else if (data) {
      setFormData({
        title: data.title,
        start_at: data.start_at,
        end_at: data.end_at,
        location: data.location || '',
        description: data.description || '',
        type: data.type,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.start_at || !formData.end_at) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { error } = await supabase
        .from('agenda_events')
        .update({
          title: formData.title,
          start_at: formData.start_at,
          end_at: formData.end_at,
          location: formData.location || null,
          description: formData.description || null,
          type: formData.type,
        })
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Événement modifié avec succès');
      onOpenChange(false);
      onEventUpdated?.();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier l'événement</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'événement"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date et heure de début *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Date et heure de fin *</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_at}
                  onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rdv">Rendez-vous</SelectItem>
                  <SelectItem value="demo">Démo</SelectItem>
                  <SelectItem value="appel">Appel</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Lieu</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Adresse ou lieu"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Notes ou description"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
