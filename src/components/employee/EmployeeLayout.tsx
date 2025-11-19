import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { EmployeeTabBar } from "./EmployeeTabBar";
import { EmployeeHeader } from "./EmployeeHeader";
import { OfflineBanner } from "./OfflineBanner";
import { InstallPrompt } from "./InstallPrompt";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { useUserRole } from "@/hooks/useUserRole";

export const EmployeeLayout = () => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();

  // Rediriger les admins/owners vers le CRM s'ils tentent d'accéder à l'app employé
  useEffect(() => {
    if (!loading && role && role !== 'employee' && role !== 'employe_terrain') {
      navigate('/tableau-de-bord');
    }
  }, [role, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Bloquer l'accès si pas employé
  if (role && role !== 'employee' && role !== 'employe_terrain') {
    return null; // Redirection en cours via useEffect
  }

  return (
    <EmployeeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <OfflineBanner />
        <EmployeeHeader />
        
        <main className="flex-1 overflow-auto pb-20">
          <Outlet />
        </main>

        <EmployeeTabBar />
        <InstallPrompt />
      </div>
    </EmployeeProvider>
  );
};
