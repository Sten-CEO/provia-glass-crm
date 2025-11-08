import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubFunctionsDrawer } from "@/components/layout/SubFunctionsDrawer";

const subFunctions = [
  { label: "Consommables", path: "/inventaire/consommables" },
  { label: "Matériels", path: "/inventaire/materiels" },
  { label: "Mouvements", path: "/inventaire/mouvements" },
  { label: "Achats", path: "/inventaire/achats" },
];

const InventaireMouvements = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [subFunctionsOpen, setSubFunctionsOpen] = useState(false);

  const loadMovements = async () => {
    const { data, error } = await supabase
      .from("inventory_movements")
      .select(`
        *,
        inventory_items (name, type)
      `)
      .order("date", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setMovements(data || []);
  };

  useEffect(() => {
    loadMovements();

    const channel = supabase
      .channel("inventory_movements_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_movements" }, () => {
        loadMovements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      in: "Entrée",
      out: "Sortie",
      reserve: "Réservation",
      unreserve: "Déréservation",
      expected_in: "Entrée prévue",
      expected_out: "Sortie prévue",
    };
    return labels[type] || type;
  };

  const getStatusVariant = (status: string) => {
    if (status === "done") return "default";
    if (status === "planned") return "secondary";
    if (status === "canceled") return "destructive";
    return "outline";
  };

  const consommablesMovements = movements.filter(m => m.inventory_items?.type === "consommable");
  const materielsMovements = movements.filter(m => m.inventory_items?.type === "materiel");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold uppercase tracking-wide">Mouvements de Stock</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSubFunctionsOpen(true)}
            title="Sous-fonctions"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="consommables">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="consommables">Consommables</TabsTrigger>
          <TabsTrigger value="materiels">Matériels</TabsTrigger>
        </TabsList>

        <TabsContent value="consommables">
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Date</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Article</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Type</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Source</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Quantité</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {consommablesMovements.map((movement) => (
                    <tr key={movement.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(movement.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-4">{movement.inventory_items?.name}</td>
                      <td className="p-4">
                        <Badge variant="outline">{getTypeLabel(movement.type)}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground capitalize">{movement.source}</td>
                      <td className="p-4">
                        <span className={movement.type.includes("out") || movement.type === "reserve" ? "text-destructive" : "text-green-500"}>
                          {movement.type.includes("out") || movement.type === "reserve" ? "-" : "+"}{movement.qty}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(movement.status)}>
                          {movement.status === "done" ? "Effectué" : movement.status === "planned" ? "Prévu" : "Annulé"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{movement.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="materiels">
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Date</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Article</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Type</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Source</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Quantité</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {materielsMovements.map((movement) => (
                    <tr key={movement.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(movement.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-4">{movement.inventory_items?.name}</td>
                      <td className="p-4">
                        <Badge variant="outline">{getTypeLabel(movement.type)}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground capitalize">{movement.source}</td>
                      <td className="p-4">
                        <span className={movement.type.includes("out") || movement.type === "reserve" ? "text-destructive" : "text-green-500"}>
                          {movement.type.includes("out") || movement.type === "reserve" ? "-" : "+"}{movement.qty}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(movement.status)}>
                          {movement.status === "done" ? "Effectué" : movement.status === "planned" ? "Prévu" : "Annulé"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{movement.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <SubFunctionsDrawer
        open={subFunctionsOpen}
        onOpenChange={setSubFunctionsOpen}
        title="Mouvements"
        subFunctions={subFunctions}
      />
    </div>
  );
};

export default InventaireMouvements;
