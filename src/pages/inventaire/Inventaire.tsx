import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SubFunctionsDrawer } from "@/components/layout/SubFunctionsDrawer";
import InventaireConsommables from "./InventaireConsommables";
import InventaireMateriels from "./InventaireMateriels";

const subFunctions = [
  { label: "Consommables", path: "/inventaire/consommables" },
  { label: "Matériels", path: "/inventaire/materiels" },
  { label: "Mouvements", path: "/inventaire/mouvements" },
  { label: "Achats", path: "/inventaire/achats" },
  { label: "Alertes stock", path: "/inventaire?filter=alerts" },
];

const Inventaire = () => {
  const [subFunctionsOpen, setSubFunctionsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold uppercase tracking-wide">Inventaire</h1>
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

      <Tabs defaultValue="consommables" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="consommables" onClick={() => navigate("/inventaire/consommables")}>
            Consommables
          </TabsTrigger>
          <TabsTrigger value="materiels" onClick={() => navigate("/inventaire/materiels")}>
            Matériels
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="consommables" className="mt-6">
          <InventaireConsommables />
        </TabsContent>
        
        <TabsContent value="materiels" className="mt-6">
          <InventaireMateriels />
        </TabsContent>
      </Tabs>

      <SubFunctionsDrawer
        open={subFunctionsOpen}
        onOpenChange={setSubFunctionsOpen}
        title="Inventaire"
        subFunctions={subFunctions}
      />
    </div>
  );
};

export default Inventaire;
