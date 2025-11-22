import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

export const EmployeeLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Identifiants incorrects");
        } else {
          toast.error(error.message || "Erreur de connexion");
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        // Verify that this is an employee account
        const { data: userRole, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .single();

        if (roleError) {
          console.error("❌ Role fetch error:", roleError);
          toast.error("Erreur lors de la vérification du compte");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        console.log("Role found:", userRole?.role);

        // Employee App Login: Block non-employee accounts
        if (userRole?.role !== 'employe_terrain') {
          console.log("❌ Non-employee account attempted employee login - BLOCKING");
          console.log("Account role:", userRole?.role, "- Should use CRM login instead");
          toast.error("Ce compte est réservé au CRM. Veuillez utiliser la page de connexion CRM à /auth/login.", {
            duration: 5000,
          });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Valid employee account - redirect to employee dashboard
        console.log("✅ Employee access granted");
        toast.success("Connexion réussie");
        navigate("/employee");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur de connexion");
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
          Espace Employé
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Connectez-vous pour accéder à vos interventions
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass-card"
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
              required
              className="glass-card"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
};
