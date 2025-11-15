import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  nom: string;
  email?: string;
}

interface ClientSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientSelectorDialog({ open, onOpenChange }: ClientSelectorDialogProps) {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  const loadClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("id, nom, email")
      .order("nom");
    if (data) setClients(data);
    setLoading(false);
  };

  const handleSelectClient = (clientId: string) => {
    onOpenChange(false);
    navigate(`/clients/${clientId}?tab=contrat`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sélectionner un client</DialogTitle>
        </DialogHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Rechercher un client..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Chargement..." : "Aucun client trouvé"}
            </CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.nom}
                  onSelect={() => handleSelectClient(client.id)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{client.nom}</span>
                    {client.email && (
                      <span className="text-sm text-muted-foreground">
                        {client.email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
