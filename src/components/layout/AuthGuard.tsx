import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { useBillingSubscription, getCompanyOwnerUserId } from "@/hooks/useBillingSubscription";
import { CreditCard, AlertTriangle } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Emails exemptés de la vérification d'abonnement (comptes admin/support)
const BILLING_EXEMPT_EMAILS = [
  'support@proviabase.fr',
];

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const { role, companyId, loading: roleLoading } = useUserRole();
  const { isActive, loading: subscriptionLoading } = useBillingSubscription(ownerUserId || undefined);

  // Check if user is exempt from billing
  const isBillingExempt = user?.email && BILLING_EXEMPT_EMAILS.includes(user.email);

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

  // Get owner user ID for subscription check
  useEffect(() => {
    if (companyId && !roleLoading) {
      console.log('[AuthGuard] Getting owner for subscription check:', { companyId, role, currentUserId: user?.id });

      // If current user is owner, use their ID directly
      if (role === 'owner') {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            console.log('[AuthGuard] User is owner, using their ID:', user.id);
            setOwnerUserId(user.id);
          }
        });
      } else {
        // Otherwise, fetch the owner's user ID from company
        console.log('[AuthGuard] User is member (role:', role, '), fetching company owner...');
        getCompanyOwnerUserId(companyId).then((ownerId) => {
          console.log('[AuthGuard] Company owner ID:', ownerId);
          setOwnerUserId(ownerId);
        });
      }
    }
  }, [companyId, role, roleLoading, user?.id]);

  // Bloquer les employés terrain du CRM
  useEffect(() => {
    if (!roleLoading && role === 'employe_terrain' && !location.pathname.startsWith('/employee')) {
      // Employé terrain essaie d'accéder au CRM -> rediriger vers app employé
      navigate('/employee');
    }
  }, [role, roleLoading, location.pathname, navigate]);

  if (loading || roleLoading || (companyId && subscriptionLoading)) {
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
  if (role === 'employe_terrain' && !location.pathname.startsWith('/employee')) {
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

  // Bloquer l'accès UNIQUEMENT pour les OWNERS si leur abonnement n'est pas actif
  // Les membres ne sont JAMAIS bloqués - ils accèdent via l'abonnement du propriétaire
  // v2.0 - Fix membre subscription check
  const isOwner = role === 'owner';

  if (isOwner && !isActive && !isBillingExempt && !location.pathname.startsWith('/employee')) {
    console.log('[AuthGuard] BLOCKING OWNER - subscription not active:', {
      ownerUserId,
      isActive,
      isBillingExempt,
      role,
      currentUserId: user?.id,
    });

    return (
      <div className="flex items-center justify-center h-screen p-8 bg-background">
        <div className="glass-modal max-w-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Abonnement requis</h2>
          <p className="text-muted-foreground mb-6">
            Votre abonnement n'est pas actif. Pour continuer à utiliser Provia BASE,
            veuillez mettre à jour votre abonnement.
          </p>
          <div className="space-y-3">
            <a
              href="https://www.proviabase.fr/billing/required"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold transition-colors"
            >
              <CreditCard className="h-5 w-5" />
              Gérer mon abonnement
            </a>
            <button
              onClick={() => {
                supabase.auth.signOut();
                navigate('/auth/login');
              }}
              className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
