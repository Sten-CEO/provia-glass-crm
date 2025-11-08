import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Inventaire = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab from current route
  const activeTab = location.pathname.includes('/materiels') ? 'materiels' : 'consommables';

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold uppercase tracking-wide">Inventaire</h1>

      {/* Persistent tab bar */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10">
          <TabsTrigger 
            value="consommables" 
            onClick={() => navigate("/inventaire/consommables")}
          >
            Consommables
          </TabsTrigger>
          <TabsTrigger 
            value="materiels" 
            onClick={() => navigate("/inventaire/materiels")}
          >
            Matériels
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default Inventaire;
