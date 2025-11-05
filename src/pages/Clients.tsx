import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

interface Client {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
}

const initialClients: Client[] = [
  { id: "1", nom: "Entreprise ABC", email: "contact@abc.com", telephone: "01 23 45 67 89", ville: "Paris" },
  { id: "2", nom: "Société XYZ", email: "info@xyz.com", telephone: "01 98 76 54 32", ville: "Lyon" },
  { id: "3", nom: "Client Premium", email: "hello@premium.com", telephone: "01 11 22 33 44", ville: "Marseille" },
];

const Clients = () => {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [newClient, setNewClient] = useState({ nom: "", email: "", telephone: "", ville: "" });
  const navigate = useNavigate();

  const handleAddClient = () => {
    const client: Client = {
      id: Date.now().toString(),
      ...newClient,
    };
    setClients([...clients, client]);
    setNewClient({ nom: "", email: "", telephone: "", ville: "" });
    setOpen(false);
  };

  const filteredClients = clients.filter((client) =>
    client.nom.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Clients</h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Client
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Nouveau Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={newClient.nom}
                  onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={newClient.telephone}
                  onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  value={newClient.ville}
                  onChange={(e) => setNewClient({ ...newClient, ville: e.target.value })}
                  className="glass-card"
                />
              </div>
              <Button onClick={handleAddClient} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 glass-card"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Nom</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Email</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Téléphone</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Ville</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-white/5 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <td className="p-4 font-medium">{client.nom}</td>
                  <td className="p-4 text-muted-foreground">{client.email}</td>
                  <td className="p-4 text-muted-foreground">{client.telephone}</td>
                  <td className="p-4 text-muted-foreground">{client.ville}</td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm">Voir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Clients;
