import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { role, loading: roleLoading } = useUserRole();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/auth/login');
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/auth/login');
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Bloquer les employés terrain du CRM
  useEffect(() => {
    if (!roleLoading && (role === 'employee' || role === 'employe_terrain') && !location.pathname.startsWith('/employee')) {
      // Employé terrain essaie d'accéder au CRM -> rediriger vers app employé
      navigate('/employee');
    }
  }, [role, roleLoading, location.pathname, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Bloquer l'accès CRM pour les employés terrain
  if ((role === 'employee' || role === 'employe_terrain') && !location.pathname.startsWith('/employee')) {
    return (
      <div className="flex items-center justify-center h-screen p-8">
        <div className="glass-modal max-w-md p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Accès Réservé</h2>
          <p className="text-muted-foreground mb-6">
            Cette section est réservée aux administrateurs et au personnel de bureau.
            <br />
            Veuillez utiliser l'application mobile employé.
          </p>
          <button 
            onClick={() => navigate('/employee')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Aller à l'App Employé
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
