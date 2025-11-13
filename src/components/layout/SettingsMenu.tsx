import { useState } from "react";
import { Settings, Building2, FileText, BookOpen, Percent, Users, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SettingsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { icon: Building2, label: "Société", path: "/parametres" },
    { icon: FileText, label: "Modèles", path: "/parametres/templates" },
    { icon: BookOpen, label: "Catalogues", path: "/parametres/services" },
    { icon: Percent, label: "Taxes", path: "/parametres/taxes" },
    { icon: Users, label: "Équipe", path: "/equipe" },
    { icon: User, label: "Mon profil", path: "/profil" },
  ];

  const handleItemClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/auth/login");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-56 bg-background border rounded-lg shadow-lg p-2">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleItemClick(item.path)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
              <div className="border-t my-2" />
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
