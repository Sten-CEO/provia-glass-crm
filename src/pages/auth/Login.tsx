import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, testNetworkConnectivity } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";
import { Loader2 } from "lucide-react";

// ==================== DEBUG LOGGING ====================
const DEBUG = true;

function debugLog(category: string, message: string, data?: unknown) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  const prefix = `[LOGIN-DEBUG ${timestamp}] [${category}]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}
// ==================== END DEBUG LOGGING ====================

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
    debugLog('INIT', '=== LOGIN COMPONENT MOUNTED ===');
    debugLog('INIT', 'Running network connectivity test...');

    const runNetworkTest = async () => {
      try {
        const result = await testNetworkConnectivity();
        const status = result.success
          ? "✅ Network OK"
          : `❌ Network issues: ${result.errors.join(", ")}`;
        setNetworkStatus(status);
        debugLog('INIT', 'Network test complete', result);

        if (!result.success) {
          toast.error(`Problème réseau détecté: ${result.errors.join(", ")}`);
        }
      } catch (err) {
        const error = err as Error;
        setNetworkStatus(`❌ Test failed: ${error.message}`);
        debugLog('INIT', 'Network test exception', { error: error.message, stack: error.stack });
      }
    };

    runNetworkTest();
  }, []);

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      debugLog('SESSION', 'Checking existing session...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        debugLog('SESSION', 'getSession result', {
          hasSession: !!session,
          sessionError: sessionError?.message,
          userId: session?.user?.id
        });

        if (session) {
          debugLog('SESSION', 'Session found, checking user role...');
          const { data: userRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          debugLog('SESSION', 'User role query result', {
            userRole,
            roleError: roleError?.message
          });

          if (userRole?.role === 'employe_terrain') {
            debugLog('SESSION', 'Redirecting to /employee');
            navigate("/employee");
          } else {
            debugLog('SESSION', 'Redirecting to /tableau-de-bord');
            navigate("/tableau-de-bord");
          }
        } else {
          debugLog('SESSION', 'No existing session');
        }
      } catch (err) {
        const error = err as Error;
        debugLog('SESSION', 'Session check exception', {
          error: error.message,
          stack: error.stack
        });
        console.error('Session check failed:', err);
      }
    };

    checkSessionAndRedirect();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    debugLog('LOGIN', '=== LOGIN ATTEMPT STARTED ===');
    debugLog('LOGIN', 'Email:', email);

    if (!email || !password) {
      debugLog('LOGIN', 'Validation failed: missing fields');
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    debugLog('LOGIN', 'Calling supabase.auth.signInWithPassword...');
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      const elapsed = Date.now() - startTime;
      debugLog('LOGIN', `signInWithPassword completed in ${elapsed}ms`, {
        hasData: !!data,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        error: error ? {
          message: error.message,
          name: error.name,
          status: error.status,
          code: error.code
        } : null
      });

      if (error) {
        debugLog('LOGIN', 'Login error details', {
          message: error.message,
          name: error.name,
          status: error.status,
          code: error.code,
          stack: (error as Error).stack
        });

        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou mot de passe incorrect");
        } else {
          toast.error(`Erreur: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        debugLog('LOGIN', 'Login successful, checking user role...');
        const { data: userRole, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .single();

        debugLog('LOGIN', 'User role query result', {
          userRole,
          roleError: roleError?.message
        });

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

        debugLog('LOGIN', 'Login complete, navigating to dashboard');
        toast.success("Connexion réussie");
        navigate("/tableau-de-bord");
      }
    } catch (err) {
      const error = err as Error;
      debugLog('LOGIN', 'Login exception caught', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      console.error('Login error:', error);
      toast.error(`Erreur de connexion: ${error.message}`);
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    debugLog('SIGNUP', '=== SIGNUP ATTEMPT STARTED ===');
    debugLog('SIGNUP', 'Email:', email);

    if (!email || !password || !confirmPassword) {
      debugLog('SIGNUP', 'Validation failed: missing fields');
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      debugLog('SIGNUP', 'Validation failed: passwords do not match');
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      debugLog('SIGNUP', 'Validation failed: password too short');
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/tableau-de-bord`;
    debugLog('SIGNUP', 'Redirect URL:', redirectUrl);
    debugLog('SIGNUP', 'Calling supabase.auth.signUp...');
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      const elapsed = Date.now() - startTime;
      debugLog('SIGNUP', `signUp completed in ${elapsed}ms`, {
        hasData: !!data,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        userId: data?.user?.id,
        error: error ? {
          message: error.message,
          name: error.name,
          status: error.status,
          code: error.code
        } : null
      });

      if (error) {
        debugLog('SIGNUP', 'Signup error details', {
          message: error.message,
          name: error.name,
          status: error.status,
          code: error.code,
          stack: (error as Error).stack
        });

        if (error.message.includes("User already registered")) {
          toast.error("Cet email est déjà utilisé");
        } else {
          toast.error(`Erreur: ${error.message}`);
        }
        return;
      }

      debugLog('SIGNUP', 'Signup successful');
      toast.success("Compte créé avec succès");
      setIsSignUp(false);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const error = err as Error;
      debugLog('SIGNUP', 'Signup exception caught', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      toast.error(`Erreur lors de la création du compte: ${error.message}`);
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
          <div>Network: {networkStatus}</div>
          <div>Protocol: {window.location.protocol}</div>
          <div>Host: {window.location.host}</div>
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

        {/* Debug: Open Console Instructions */}
        <div className="mt-4 p-2 bg-yellow-900/30 rounded text-xs text-yellow-300">
          <strong>DEBUG MODE:</strong> Ouvrez la console (Cmd+Option+I) pour voir les logs détaillés
        </div>
      </div>
    </div>
  );
};

export default Login;
