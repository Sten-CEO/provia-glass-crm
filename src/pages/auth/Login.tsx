import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";
import { Loader2 } from "lucide-react";

// Check if we're in Tauri
const isTauri = typeof window !== 'undefined' && (
  '__TAURI__' in window ||
  '__TAURI_INTERNALS__' in window ||
  window.location.protocol === 'tauri:' ||
  (window.location.protocol === 'https:' && window.location.hostname === 'tauri.localhost')
);

// Tauri invoke function
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    throw new Error('Not in Tauri environment');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// Types for Tauri responses
interface AuthResponse {
  success: boolean;
  data?: {
    access_token?: string;
    refresh_token?: string;
    user?: {
      id: string;
      email: string;
    };
  };
  error?: string;
}

interface NetworkTestResponse {
  success: boolean;
  status: number;
  error?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [networkStatus, setNetworkStatus] = useState<string>("Testing...");

  // Run network test on component mount
  useEffect(() => {
    const runNetworkTest = async () => {
      if (isTauri) {
        try {
          console.log('[LOGIN] Testing network via Tauri command...');
          const result = await tauriInvoke<NetworkTestResponse>('test_network');
          setNetworkStatus(result.success ? "✅ Network OK (Tauri)" : `❌ ${result.error}`);
          console.log('[LOGIN] Network test result:', result);
        } catch (err) {
          const error = err as Error;
          setNetworkStatus(`❌ Tauri test failed: ${error.message}`);
          console.error('[LOGIN] Network test error:', error);
        }
      } else {
        setNetworkStatus("✅ Web mode");
      }
    };

    runNetworkTest();
  }, []);

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          if (userRole?.role === 'employe_terrain') {
            navigate("/employee");
          } else {
            navigate("/tableau-de-bord");
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };

    checkSessionAndRedirect();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      if (isTauri) {
        // Use Tauri command for login
        console.log('[LOGIN] Using Tauri command for sign in...');
        console.log('[LOGIN] SUPABASE_URL:', SUPABASE_URL);
        console.log('[LOGIN] SUPABASE_KEY:', SUPABASE_KEY ? SUPABASE_KEY.substring(0, 20) + '...' : 'MISSING');
        console.log('[LOGIN] Email:', email);

        const result = await tauriInvoke<AuthResponse>('supabase_sign_in', {
          supabaseUrl: SUPABASE_URL,
          supabaseKey: SUPABASE_KEY,
          email,
          password,
        });

        console.log('[LOGIN] Tauri sign in result:', JSON.stringify(result, null, 2));

        if (!result.success) {
          toast.error(result.error || "Erreur de connexion");
          setLoading(false);
          return;
        }

        // Set the session in Supabase client
        if (result.data?.access_token && result.data?.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: result.data.access_token,
            refresh_token: result.data.refresh_token,
          });

          if (sessionError) {
            toast.error("Erreur lors de la connexion");
            setLoading(false);
            return;
          }
        }

        // Check user role
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          if (roleError) {
            toast.error("Erreur lors de la récupération du rôle");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

          if (userRole?.role === 'employe_terrain') {
            toast.error("Ce compte est réservé à l'application employé.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

          toast.success("Connexion réussie");
          navigate("/tableau-de-bord");
        }
      } else {
        // Use standard Supabase auth for web
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou mot de passe incorrect");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        if (data.session) {
          const { data: userRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.session.user.id)
            .single();

          if (roleError) {
            toast.error("Erreur lors de la récupération du rôle");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

          if (userRole?.role === 'employe_terrain') {
            toast.error("Ce compte est réservé à l'application employé.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

          toast.success("Connexion réussie");
          navigate("/tableau-de-bord");
        }
      }
    } catch (err) {
      console.error('[LOGIN] Login error:', err);
      console.error('[LOGIN] Error type:', typeof err);
      console.error('[LOGIN] Error stringified:', JSON.stringify(err));

      // Tauri errors can be strings or objects
      let errorMessage = 'Erreur inconnue';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String((err as { message: unknown }).message);
      }

      toast.error(`Erreur de connexion: ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      if (isTauri) {
        // Use Tauri command for sign up
        console.log('[LOGIN] Using Tauri command for sign up...');
        const result = await tauriInvoke<AuthResponse>('supabase_sign_up', {
          supabaseUrl: SUPABASE_URL,
          supabaseKey: SUPABASE_KEY,
          email,
          password,
        });

        console.log('[LOGIN] Tauri sign up result:', result);

        if (!result.success) {
          if (result.error?.includes("already registered")) {
            toast.error("Cet email est déjà utilisé");
          } else {
            toast.error(result.error || "Erreur lors de la création du compte");
          }
          setLoading(false);
          return;
        }

        toast.success("Compte créé avec succès ! Vérifiez votre email.");
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        // Use standard Supabase auth for web
        const redirectUrl = `${window.location.origin}/tableau-de-bord`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("Cet email est déjà utilisé");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success("Compte créé avec succès ! Vérifiez votre email.");
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      const error = err as Error;
      toast.error(`Erreur: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="glass-modal w-full max-w-md p-8 animate-scale-in">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Provia Base" className="w-24 h-24 object-contain" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-2 uppercase tracking-wide">
          Provia Base
        </h1>
        <p className="text-center text-muted-foreground mb-4">
          {isSignUp ? "Créez votre compte CRM" : "Connectez-vous à votre CRM"}
        </p>

        {/* Debug: Network Status */}
        <div className="mb-4 p-2 bg-gray-800 rounded text-xs font-mono text-gray-300 overflow-auto">
          <div>Mode: {isTauri ? "Tauri Desktop" : "Web"}</div>
          <div>Network: {networkStatus}</div>
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-card"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-card"
              disabled={loading}
              required
            />
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-card"
                disabled={loading}
                required
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              isSignUp ? "Créer un compte" : "Se connecter"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setPassword("");
              setConfirmPassword("");
            }}
            className="text-sm text-primary hover:underline"
            disabled={loading}
          >
            {isSignUp
              ? "Déjà un compte ? Se connecter"
              : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
