import { useState } from "react";
import { Plus, FileText, Receipt, Briefcase, Users, Package, TrendingDown, CheckSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const QuickCreateMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { icon: FileText, label: "Devis", path: "/devis/new" },
    { icon: Receipt, label: "Facture", path: "/factures/new" },
    { icon: Briefcase, label: "Intervention", path: "/interventions/nouvelle" },
    { icon: Users, label: "Client", path: "/clients" },
    { icon: Package, label: "Produit", path: "/inventaire" },
    { icon: TrendingDown, label: "Dépense", path: "/parametres" },
    { icon: CheckSquare, label: "Tâche", path: "/interventions" },
    { icon: Calendar, label: "Rendez-vous", path: "/agenda" },
  ];

  const handleItemClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="default"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary hover:bg-primary/90"
      >
        <Plus className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-64 bg-background border rounded-lg shadow-lg p-2">
            <div className="grid grid-cols-2 gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    onClick={() => handleItemClick(item.path)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
