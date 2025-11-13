import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Lock, Save } from "lucide-react";
import { toast } from "sonner";

export default function Profil() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setEmail(user.email || "");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast.error("Erreur lors du changement de mot de passe");
    } else {
      toast.success("Mot de passe modifié avec succès");
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et paramètres de compte
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-2xl">
              {email.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{email}</h2>
            <p className="text-sm text-muted-foreground">Administrateur</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              L'email ne peut pas être modifié directement
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Changer le mot de passe
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez le nouveau mot de passe"
                />
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Enregistrement..." : "Changer le mot de passe"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
