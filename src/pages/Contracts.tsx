import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface Contract {
  id: string;
  contract_number: string;
  title: string;
  status: string;
  client_id: string;
  clients: { nom: string };
  updated_at: string;
}

export default function Contracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        *,
        clients:client_id (nom)
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des contrats");
      return;
    }

    setContracts(data || []);
    setLoading(false);
  };

  const filteredContracts = contracts.filter((contract) =>
    contract.contract_number.toLowerCase().includes(search.toLowerCase()) ||
    contract.title.toLowerCase().includes(search.toLowerCase()) ||
    contract.clients?.nom.toLowerCase().includes(search.toLowerCase())
  );

  // Group contracts by client
  const contractsByClient = filteredContracts.reduce((acc, contract) => {
    const clientName = contract.clients?.nom || "Sans client";
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(contract);
    return acc;
  }, {} as Record<string, Contract[]>);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: "secondary",
      active: "default",
      expired: "destructive",
      canceled: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contrats</h1>
          <p className="text-muted-foreground">
            Gérez tous les contrats de vos clients
          </p>
        </div>
        <Button onClick={() => navigate("/contracts/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contrat
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contrat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contracts by Client */}
      <div className="space-y-6">
        {Object.entries(contractsByClient).map(([clientName, clientContracts]) => (
          <div key={clientName} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{clientName}</h2>
              <Badge variant="outline">{clientContracts.length} contrat(s)</Badge>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière MAJ</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientContracts.map((contract) => (
                  <TableRow
                    key={contract.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/contracts/${contract.id}`)}
                  >
                    <TableCell className="font-medium">{contract.contract_number}</TableCell>
                    <TableCell>{contract.title}</TableCell>
                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                    <TableCell>
                      {new Date(contract.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/contracts/${contract.id}`);
                        }}
                      >
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun contrat trouvé</p>
        </div>
      )}
    </div>
  );
}
