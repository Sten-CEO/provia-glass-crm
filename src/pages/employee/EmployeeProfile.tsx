import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { LogOut, User, Mail, Phone, Camera } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface EmployeeProfile {
  id: string;
  nom: string;
  email: string;
  phone: string | null;
  role: string;
  user_id: string;
}

export const EmployeeProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/employee/login");
        return;
      }

      const { data: employee, error } = await supabase
        .from("equipe")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProfile(employee);
    } catch (error: any) {
      toast.error("Erreur de chargement du profil");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/employee/login");
  };

  const handleUpdatePhone = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("equipe")
        .update({ phone: profile.phone })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Téléphone mis à jour");
    } catch (error: any) {
      toast.error("Erreur de mise à jour");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Profil introuvable</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header avec Avatar */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile.nom.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{profile.nom}</h2>
            <p className="text-sm text-muted-foreground capitalize">{profile.role}</p>
          </div>
        </div>
      </Card>

      {/* Informations personnelles */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Informations personnelles</h3>
        
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Nom complet
          </Label>
          <Input value={profile.nom} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </Label>
          <Input value={profile.email} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Téléphone
          </Label>
          <div className="flex gap-2">
            <Input
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+33 6 12 34 56 78"
            />
            <Button onClick={handleUpdatePhone}>Enregistrer</Button>
          </div>
        </div>
      </Card>

      {/* Préférences */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Préférences</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Notifications push</p>
            <p className="text-sm text-muted-foreground">
              Recevoir des alertes pour les nouvelles interventions
            </p>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Mode sombre</p>
            <p className="text-sm text-muted-foreground">
              Activer le thème sombre
            </p>
          </div>
          <Switch
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </div>
      </Card>

      {/* Déconnexion */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Se déconnecter
      </Button>
    </div>
  );
};
