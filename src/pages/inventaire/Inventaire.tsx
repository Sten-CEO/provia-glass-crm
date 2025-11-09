import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventaireConsommables from "./InventaireConsommables";
import InventaireMateriels from "./InventaireMateriels";

const Inventaire = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const activeTab = currentPath.includes("/materiels") ? "materiels" : "consommables";

  const handleTabChange = (value: string) => {
    navigate(`/inventaire/${value}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Inventaire</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="consommables">Consommables</TabsTrigger>
          <TabsTrigger value="materiels">Matériels</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "consommables" ? <InventaireConsommables /> : <InventaireMateriels />}
    </div>
  );
};

export default Inventaire;
