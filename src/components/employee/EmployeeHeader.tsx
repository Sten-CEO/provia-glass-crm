import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const EmployeeHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const showBackButton = location.pathname !== "/employee" && location.pathname !== "/employee/interventions";

  const getTitle = () => {
    if (location.pathname === "/employee") return "Tableau de bord";
    if (location.pathname.includes("/interventions/")) return "Intervention";
    if (location.pathname.includes("/interventions")) return "Mes interventions";
    if (location.pathname.includes("/planning")) return "Planning";
    if (location.pathname.includes("/files")) return "Fichiers";
    if (location.pathname.includes("/timesheets")) return "Pointage";
    if (location.pathname.includes("/profile")) return "Profil";
    return "Provia Base";
  };

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/40">
      <div className="flex items-center gap-3 px-4 py-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <h1 className="text-lg font-semibold text-foreground uppercase tracking-wide">
          {getTitle()}
        </h1>
      </div>
    </header>
  );
};
