import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        *,
        clients:client_id (nom, email, telephone)
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement du contrat");
      return;
    }

    setContract(data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce contrat ?")) return;

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    toast.success("Contrat supprimé");
    navigate("/contracts");
  };

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

  if (!contract) {
    return <div className="p-6">Contrat non trouvé</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{contract.contract_number}</h1>
            <p className="text-muted-foreground">{contract.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/contracts/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-6">
        {getStatusBadge(contract.status)}
      </div>

      {/* Client Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informations Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client</p>
              <p className="text-base">{contract.clients?.nom}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact</p>
              <p className="text-base">{contract.clients?.email}</p>
              <p className="text-base">{contract.clients?.telephone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Détails du contrat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date de début</p>
              <p className="text-base">
                {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date de fin</p>
              <p className="text-base">
                {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fréquence de facturation</p>
              <p className="text-base">{contract.billing_frequency || "-"}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valeur HT</p>
              <p className="text-base">{contract.value_ht?.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valeur TTC</p>
              <p className="text-base">{contract.value_ttc?.toFixed(2)} €</p>
            </div>
          </div>
          {contract.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-base whitespace-pre-wrap">{contract.description}</p>
              </div>
            </>
          )}
          {contract.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-base whitespace-pre-wrap">{contract.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
