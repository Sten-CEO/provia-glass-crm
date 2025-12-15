import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAccessControls, type AccessControls } from "@/hooks/useAccessControls";
import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredAccess?: keyof AccessControls;
}

export const ProtectedRoute = ({ children, requiredAccess }: ProtectedRouteProps) => {
  const { hasAccess, loading } = useAccessControls();
  const navigate = useNavigate();

  // Show loading while checking permissions
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no access required or user has access, render children normally
  if (!requiredAccess || hasAccess(requiredAccess)) {
    return <>{children}</>;
  }

  // If access is denied, BLOCK access completely - don't render children at all
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      <div className="text-center max-w-md p-8 glass-card rounded-2xl">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Accès refusé</h2>
        <p className="text-muted-foreground mb-6">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
        <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      </div>
    </div>
  );
};
