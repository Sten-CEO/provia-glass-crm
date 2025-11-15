import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NewEventDialogProps {
  onEventCreated?: () => void;
}

export const NewEventDialog = ({ onEventCreated }: NewEventDialogProps) => {
  const [open, setOpen] = useState(false);
  const [clientMode, setClientMode] = useState<'existing' | 'external'>('existing');
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    start_at: '',
    end_at: '',
    location: '',
    notes: '',
    type: 'rdv',
    client_id: '',
    external_client_name: '',
    external_client_phone: '',
    external_client_email: '',
    employee_ids: [] as string[],
  });

  const loadClientsAndEmployees = async () => {
    const [clientsData, employeesData] = await Promise.all([
      supabase.from('clients').select('id, nom').order('nom'),
      supabase.from('equipe').select('id, nom').order('nom'),
    ]);

    if (clientsData.data) setClients(clientsData.data);
    if (employeesData.data) setEmployees(employeesData.data);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.start_at || !formData.end_at) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { data: event, error: eventError } = await supabase
        .from('agenda_events')
        .insert({
          title: formData.title,
          start_at: formData.start_at,
          end_at: formData.end_at,
          location: formData.location || null,
          description: formData.notes || null,
          type: formData.type,
          status: 'à venir',
        })
        .select()
        .single();

      if (eventError) throw eventError;

      if (clientMode === 'existing' && formData.client_id) {
        await supabase.from('event_clients').insert({
          event_id: event.id,
          client_id: formData.client_id,
        });
      } else if (clientMode === 'external' && formData.external_client_name) {
        await supabase.from('event_clients').insert({
          event_id: event.id,
          external_client_name: formData.external_client_name,
          external_client_phone: formData.external_client_phone || null,
          external_client_email: formData.external_client_email || null,
        });
      }

      if (formData.employee_ids.length > 0) {
        await supabase.from('event_assignees').insert(
          formData.employee_ids.map(emp_id => ({
            event_id: event.id,
            employee_id: emp_id,
          }))
        );
      }

      toast.success('Rendez-vous créé avec succès');
      setOpen(false);
      setFormData({
        title: '',
        start_at: '',
        end_at: '',
        location: '',
        notes: '',
        type: 'rdv',
        client_id: '',
        external_client_name: '',
        external_client_phone: '',
        external_client_email: '',
        employee_ids: [],
      });
      onEventCreated?.();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) loadClientsAndEmployees();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau rendez-vous
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau rendez-vous</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Titre du rendez-vous"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date/heure début *</Label>
              <Input
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Date/heure fin *</Label>
              <Input
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Lieu</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Adresse ou lieu du rendez-vous"
            />
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
            <Label>Client</Label>
            <Tabs value={clientMode} onValueChange={(value: any) => setClientMode(value)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Client existant</TabsTrigger>
                <TabsTrigger value="external">Client hors CRM</TabsTrigger>
              </TabsList>
              <TabsContent value="existing" className="mt-4">
                <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="external" className="mt-4 space-y-4">
                <div>
                  <Label>Nom du client</Label>
                  <Input
                    value={formData.external_client_name}
                    onChange={(e) => setFormData({ ...formData, external_client_name: e.target.value })}
                    placeholder="Nom du client"
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.external_client_phone}
                    onChange={(e) => setFormData({ ...formData, external_client_phone: e.target.value })}
                    placeholder="Téléphone"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={formData.external_client_email}
                    onChange={(e) => setFormData({ ...formData, external_client_email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Label>Participants (employés)</Label>
            <Select
              value={formData.employee_ids[0] || ''}
              onValueChange={(value) => {
                const newIds = formData.employee_ids.includes(value)
                  ? formData.employee_ids.filter(id => id !== value)
                  : [...formData.employee_ids, value];
                setFormData({ ...formData, employee_ids: newIds });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner des participants" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.employee_ids.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {formData.employee_ids.map(id => {
                  const emp = employees.find(e => e.id === id);
                  return emp ? (
                    <span key={id} className="text-xs bg-muted px-2 py-1 rounded">
                      {emp.nom}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div>
            <Label>Notes internes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes internes"
              rows={3}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Créer le rendez-vous
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
