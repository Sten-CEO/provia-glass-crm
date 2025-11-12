import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Mail } from "lucide-react";
import { toast } from "sonner";

export const EmployeeProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate("/employee/login");
        return;
      }

      setUser(authUser);

      // Load employee info using user_id
      const { data: empData } = await supabase
        .from("equipe")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      setEmployee(empData);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/employee/login");
      toast.success("Déconnexion réussie");
    } catch (error: any) {
      toast.error("Erreur de déconnexion");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h2 className="text-xl font-semibold mb-4">Profil</h2>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">
                {employee?.nom || "Employé"}
              </p>
              <p className="text-sm text-muted-foreground">
                {employee?.role || "Technicien"}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{user?.email}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Statistiques</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">-</p>
            <p className="text-sm text-muted-foreground">Interventions</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">-</p>
            <p className="text-sm text-muted-foreground">Heures ce mois</p>
          </div>
        </div>
      </Card>

      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Déconnexion
      </Button>
    </div>
  );
};
