import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, User, Mail, Phone, Camera, Globe, Lock, Key } from "lucide-react";
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
  const [lang, setLang] = useState("fr");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      setLang(employee.lang || "fr");
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

  const handleLanguageChange = async (newLang: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("equipe")
        .update({ lang: newLang })
        .eq("id", profile.id);

      if (error) throw error;

      setLang(newLang);
      toast.success(newLang === "fr" ? "Langue changée en Français" : "Language changed to English");
    } catch (error) {
      console.error("Language change error:", error);
      toast.error("Erreur de mise à jour");
    }
  };

  const handleUpdateEmail = async () => {
    if (!profile || !newEmail) {
      toast.error("Veuillez saisir un nouvel email");
      return;
    }

    if (!newEmail.includes("@")) {
      toast.error("Email invalide");
      return;
    }

    try {
      // Update auth email
      const { error: authError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (authError) throw authError;

      // Update equipe table
      const { error: dbError } = await supabase
        .from("equipe")
        .update({ email: newEmail })
        .eq("id", profile.id);

      if (dbError) throw dbError;

      setProfile({ ...profile, email: newEmail });
      setNewEmail("");
      toast.success("Email mis à jour avec succès");
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour de l'email");
      console.error(error);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Mot de passe mis à jour avec succès");
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour du mot de passe");
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

      {/* Sécurité - Changement d'email */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Changer mon email
        </h3>

        <div className="space-y-2">
          <Label>Email actuel</Label>
          <Input value={profile.email} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <Label>Nouvel email</Label>
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="nouveau.email@exemple.com"
          />
        </div>

        <Button onClick={handleUpdateEmail} className="w-full">
          Mettre à jour l'email
        </Button>
      </Card>

      {/* Sécurité - Changement de mot de passe */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Changer mon mot de passe
        </h3>

        <div className="space-y-2">
          <Label>Nouveau mot de passe</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 caractères"
          />
        </div>

        <div className="space-y-2">
          <Label>Confirmer le mot de passe</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Retapez le nouveau mot de passe"
          />
        </div>

        <Button onClick={handleUpdatePassword} className="w-full">
          Mettre à jour le mot de passe
        </Button>
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

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Langue / Language
          </Label>
          <Select value={lang} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français 🇫🇷</SelectItem>
              <SelectItem value="en">English 🇬🇧</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {lang === "fr" 
              ? "Changera l'interface après rechargement" 
              : "Will change the interface after reload"}
          </p>
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
