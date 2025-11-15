import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MapPin, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string;
  street: string | null;
  zipcode: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  is_primary: boolean;
}

interface SecondaryAddressesSectionProps {
  clientId: string;
}

export const SecondaryAddressesSection = ({ clientId }: SecondaryAddressesSectionProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    zipcode: '',
    city: '',
    country: 'France',
    notes: '',
    is_primary: false,
  });

  useEffect(() => {
    loadAddresses();

    const channel = supabase
      .channel('client-addresses')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_addresses',
        filter: `client_id=eq.${clientId}`
      }, () => {
        loadAddresses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const loadAddresses = async () => {
    const { data } = await supabase
      .from('client_addresses')
      .select('*')
      .eq('client_id', clientId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) {
      setAddresses(data);
    }
  };

  const handleSave = async () => {
    if (!formData.label) {
      toast.error('Le libellé est requis');
      return;
    }

    try {
      const { error } = await supabase
        .from('client_addresses')
        .insert({
          client_id: clientId,
          ...formData,
        });

      if (error) throw error;

      toast.success('Adresse ajoutée');
      setDialogOpen(false);
      setFormData({
        label: '',
        street: '',
        zipcode: '',
        city: '',
        country: 'France',
        notes: '',
        is_primary: false,
      });
      loadAddresses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette adresse ?')) return;

    try {
      const { error } = await supabase
        .from('client_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Adresse supprimée');
      loadAddresses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const togglePrimary = async (id: string, isPrimary: boolean) => {
    try {
      if (isPrimary) {
        await supabase
          .from('client_addresses')
          .update({ is_primary: false })
          .eq('client_id', clientId);
      }

      const { error } = await supabase
        .from('client_addresses')
        .update({ is_primary: !isPrimary })
        .eq('id', id);

      if (error) throw error;

      loadAddresses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Adresses</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une adresse
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle adresse</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Libellé *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Ex: Siège social, Entrepôt..."
                />
              </div>
              <div>
                <Label>Rue</Label>
                <Input
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code postal</Label>
                  <Input
                    value={formData.zipcode}
                    onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {addresses.length === 0 ? (
          <Card className="p-4 text-center text-muted-foreground">
            Aucune adresse supplémentaire
          </Card>
        ) : (
          addresses.map((address) => (
            <Card key={address.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{address.label}</p>
                      {address.is_primary && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {address.street && <>{address.street}<br /></>}
                      {address.zipcode} {address.city}
                      {address.country && `, ${address.country}`}
                    </p>
                    {address.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {address.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePrimary(address.id, address.is_primary)}
                  >
                    <Star className={`h-4 w-4 ${address.is_primary ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(address.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
