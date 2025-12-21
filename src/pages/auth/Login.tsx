import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";
import { Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[DEBUG] ${message}`);
  };

  // Debug: Check environment and configuration on mount
  useEffect(() => {
    addLog("=== INITIALISATION ===");

    // Check environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    addLog(`VITE_SUPABASE_URL: ${supabaseUrl || 'UNDEFINED'}`);
    addLog(`VITE_SUPABASE_PUBLISHABLE_KEY: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'UNDEFINED'}`);

    // Check if we're in Tauri
    const isTauri = !!(window as any).__TAURI__;
    addLog(`Environnement Tauri: ${isTauri ? 'OUI' : 'NON'}`);

    // Check user agent
    addLog(`User Agent: ${navigator.userAgent.substring(0, 50)}...`);

    // Check if online
    addLog(`Navigator online: ${navigator.onLine}`);

    // Check protocol
    addLog(`Protocol: ${window.location.protocol}`);
    addLog(`Origin: ${window.location.origin}`);

    // Test basic fetch capability
    testNetworkConnectivity();
  }, []);

  const testNetworkConnectivity = async () => {
    addLog("=== TEST CONNECTIVITÉ ===");

    // Test 1: Simple fetch to a known URL
    try {
      addLog("Test 1: Fetch vers httpbin.org...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      addLog(`Test 1 RÉUSSI: Status ${response.status}`);
    } catch (err: any) {
      addLog(`Test 1 ÉCHOUÉ: ${err.name} - ${err.message}`);
    }

    // Test 2: Fetch to Supabase health endpoint
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      try {
        addLog(`Test 2: Fetch vers ${supabaseUrl}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        addLog(`Test 2 RÉUSSI: Status ${response.status}`);
      } catch (err: any) {
        addLog(`Test 2 ÉCHOUÉ: ${err.name} - ${err.message}`);
      }
    }

    // Test 3: Check Supabase client
    try {
      addLog("Test 3: Supabase getSession()...");
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        addLog(`Test 3 ERREUR: ${error.message}`);
      } else {
        addLog(`Test 3 RÉUSSI: Session = ${data.session ? 'ACTIVE' : 'NULL'}`);
      }
    } catch (err: any) {
      addLog(`Test 3 EXCEPTION: ${err.name} - ${err.message}`);
    }

    addLog("=== FIN TESTS ===");
  };

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          addLog(`Session check error: ${sessionError.message}`);
          return;
        }
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
      } catch (err: any) {
        addLog(`Session check failed: ${err.message}`);
      }
    };

    // Small delay to let debug logs show first
    setTimeout(checkSessionAndRedirect, 100);
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    addLog("=== TENTATIVE DE CONNEXION ===");
    addLog(`Email: ${email}`);
    addLog(`Password length: ${password.length}`);

    setLoading(true);
    try {
      addLog("Appel supabase.auth.signInWithPassword()...");
      const startTime = Date.now();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      const duration = Date.now() - startTime;
      addLog(`Durée de l'appel: ${duration}ms`);

      if (error) {
        addLog(`ERREUR LOGIN:`);
        addLog(`  - message: ${error.message}`);
        addLog(`  - status: ${error.status || 'undefined'}`);
        addLog(`  - name: ${error.name || 'undefined'}`);
        addLog(`  - cause: ${JSON.stringify(error.cause) || 'undefined'}`);

        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou mot de passe incorrect");
        } else if (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("Load failed")) {
          toast.error(`Erreur réseau: ${error.message}`);
        } else {
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }

      addLog("LOGIN RÉUSSI!");

      if (data.session) {
        addLog(`User ID: ${data.session.user.id}`);

        const { data: userRole, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .single();

        if (roleError) {
          addLog(`Role fetch error: ${roleError.message}`);
          toast.error("Erreur lors de la récupération du rôle");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        addLog(`Role: ${userRole?.role}`);

        if (userRole?.role === 'employe_terrain') {
          toast.error("Ce compte est réservé à l'application employé.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        toast.success("Connexion réussie");
        navigate("/tableau-de-bord");
      }
    } catch (error: any) {
      addLog(`EXCEPTION CATCH:`);
      addLog(`  - name: ${error.name}`);
      addLog(`  - message: ${error.message}`);
      addLog(`  - stack: ${error.stack?.substring(0, 200)}`);
      toast.error("Erreur de connexion");
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
      const redirectUrl = `${window.location.origin}/tableau-de-bord`;

      const { data, error } = await supabase.auth.signUp({
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
        return;
      }

      toast.success("Compte créé avec succès");
      setIsSignUp(false);
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Erreur lors de la création du compte");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 bg-background">
      {/* Debug Panel - Full width at top */}
      <div className="w-full max-w-4xl mx-auto mb-4 p-3 bg-black text-green-400 font-mono text-xs rounded overflow-auto max-h-64">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-white">🔧 DEBUG CONSOLE</span>
          <button
            onClick={() => setDebugLogs([])}
            className="text-red-400 hover:text-red-300"
          >
            Clear
          </button>
        </div>
        <div className="space-y-0.5">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">Chargement des logs...</div>
          ) : (
            debugLogs.map((log, i) => (
              <div key={i} className={log.includes('ÉCHOUÉ') || log.includes('ERREUR') || log.includes('EXCEPTION') ? 'text-red-400' : log.includes('RÉUSSI') ? 'text-green-400' : ''}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center">
        <div className="glass-modal w-full max-w-md p-8 animate-scale-in">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="Provia Base" className="w-24 h-24 object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2 uppercase tracking-wide">
            Provia Base
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {isSignUp ? "Créez votre compte CRM" : "Connectez-vous à votre CRM"}
          </p>

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
    </div>
  );
};

export default Login;
