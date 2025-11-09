import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
}

interface ClientPickerProps {
  value?: string;
  onChange: (clientId: string, client: Client) => void;
  disabled?: boolean;
}

export function ClientPicker({ value, onChange, disabled }: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (value && clients.length > 0) {
      const client = clients.find((c) => c.id === value);
      if (client) setSelectedClient(client);
    }
  }, [value, clients]);

  async function loadClients() {
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("id, nom, email, telephone, adresse, ville")
      .order("nom");
    if (data) setClients(data);
    setLoading(false);
  }

  function handleSelect(client: Client) {
    setSelectedClient(client);
    onChange(client.id, client);
    setOpen(false);
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between"
            disabled={disabled || loading}
          >
            {selectedClient ? selectedClient.nom : "Sélectionner un client"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un client..." />
            <CommandList>
              <CommandEmpty>Aucun client trouvé.</CommandEmpty>
              <CommandGroup>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.nom}
                    onSelect={() => handleSelect(client)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
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
        </PopoverContent>
      </Popover>
      <Button variant="outline" size="icon" disabled={disabled}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
