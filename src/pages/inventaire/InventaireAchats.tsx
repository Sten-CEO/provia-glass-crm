import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubFunctionsDrawer } from "@/components/layout/SubFunctionsDrawer";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const subFunctions = [
  { label: "Consommables", path: "/inventaire/consommables" },
  { label: "Matériels", path: "/inventaire/materiels" },
  { label: "Mouvements", path: "/inventaire/mouvements" },
  { label: "Achats", path: "/inventaire/achats" },
];

const InventaireAchats = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [subFunctionsOpen, setSubFunctionsOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    kind: "consommable",
    number: "",
    supplier: "",
    expected_date: "",
    note: "",
    items: [],
  });

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setOrders(data || []);
  };

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("purchase_orders_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddOrder = async () => {
    if (!newOrder.number || !newOrder.supplier) {
      toast.error("Numéro et fournisseur requis");
      return;
    }

    // Generate next PO number
    const poNumber = `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, "0")}`;

    const { error } = await supabase.from("purchase_orders").insert([
      {
        ...newOrder,
        number: poNumber,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Commande créée avec succès");
    setNewOrder({
      kind: "consommable",
      number: "",
      supplier: "",
      expected_date: "",
      note: "",
      items: [],
    });
    setOpen(false);
  };

  const getStatusVariant = (status: string) => {
    if (status === "reçue") return "default";
    if (status === "en_attente") return "secondary";
    if (status === "partielle") return "outline";
    if (status === "annulée") return "destructive";
    return "outline";
  };

  const consommablesOrders = orders.filter(o => o.kind === "consommable");
  const materielsOrders = orders.filter(o => o.kind === "materiel");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold uppercase tracking-wide">Achats</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSubFunctionsOpen(true)}
            title="Sous-fonctions"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Commande
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Nouvelle Commande</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={newOrder.kind} onValueChange={(v: any) => setNewOrder({ ...newOrder, kind: v })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consommable">Consommable</SelectItem>
                    <SelectItem value="materiel">Matériel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fournisseur *</Label>
                <Input
                  placeholder="Nom du fournisseur"
                  value={newOrder.supplier}
                  onChange={(e) => setNewOrder({ ...newOrder, supplier: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Date de livraison prévue</Label>
                <Input
                  type="date"
                  value={newOrder.expected_date}
                  onChange={(e) => setNewOrder({ ...newOrder, expected_date: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Note</Label>
                <Textarea
                  placeholder="Informations complémentaires..."
                  value={newOrder.note}
                  onChange={(e) => setNewOrder({ ...newOrder, note: e.target.value })}
                  className="glass-card"
                />
              </div>
              <Button onClick={handleAddOrder} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">N°</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Fournisseur</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Livraison prévue</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Date création</th>
                  </tr>
                </thead>
                <tbody>
                  {consommablesOrders.map((order) => (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{order.number}</td>
                      <td className="p-4">{order.supplier}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {order.expected_date ? new Date(order.expected_date).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(order.status)}>
                          {order.status === "en_attente" ? "En attente" : 
                           order.status === "partielle" ? "Partielle" :
                           order.status === "reçue" ? "Reçue" : "Annulée"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("fr-FR")}
                      </td>
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
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">N°</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Fournisseur</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Livraison prévue</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                    <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Date création</th>
                  </tr>
                </thead>
                <tbody>
                  {materielsOrders.map((order) => (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{order.number}</td>
                      <td className="p-4">{order.supplier}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {order.expected_date ? new Date(order.expected_date).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(order.status)}>
                          {order.status === "en_attente" ? "En attente" : 
                           order.status === "partielle" ? "Partielle" :
                           order.status === "reçue" ? "Reçue" : "Annulée"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("fr-FR")}
                      </td>
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
        title="Achats"
        subFunctions={subFunctions}
      />
    </div>
  );
};

export default InventaireAchats;
