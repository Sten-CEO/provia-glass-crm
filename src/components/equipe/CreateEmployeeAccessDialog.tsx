import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

interface CreateEmployeeAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    nom: string;
    email: string;
  };
  onSuccess: () => void;
}

export const CreateEmployeeAccessDialog = ({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: CreateEmployeeAccessDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"password" | "email">("password");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: employee.email,
    firstName: employee.nom.split(" ")[0] || "",
    lastName: employee.nom.split(" ").slice(1).join(" ") || "",
    phone: "",
  });

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateAccess = async () => {
    setLoading(true);
    try {
      const password = method === "password" ? generatePassword() : undefined;
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.error("Session error:", sessionError);
        throw new Error("Non authentifié - veuillez vous reconnecter");
      }

      const response = await supabase.functions.invoke("create-employee-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          employeeId: employee.id,
          email: formData.email,
          password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          sendEmail: method === "email",
        },
      });

      if (response.error) {
        throw response.error;
      }

      if (method === "password" && password) {
        setGeneratedPassword(password);
        toast.success("Accès créé avec succès");
      } else {
        toast.success("Invitation envoyée par email");
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error creating access:", error);
      toast.error(error.message || "Erreur lors de la création de l'accès");
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      toast.success("Mot de passe copié");
    }
  };

  const handleClose = () => {
    setGeneratedPassword(null);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un accès à l'application</DialogTitle>
        </DialogHeader>

        {generatedPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Mot de passe temporaire généré :
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-background rounded font-mono text-sm">
                  {generatedPassword}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              ⚠️ Ce mot de passe ne sera plus visible. Copiez-le maintenant et communiquez-le à l'employé de manière sécurisée.
            </p>
            <DialogFooter>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone (optionnel)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Méthode d'accès</Label>
                <RadioGroup value={method} onValueChange={(v: any) => setMethod(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="password" id="password" />
                    <Label htmlFor="password" className="font-normal cursor-pointer">
                      Générer un mot de passe temporaire
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email-invite" />
                    <Label htmlFor="email-invite" className="font-normal cursor-pointer">
                      Envoyer une invitation par email
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateAccess} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer l'accès
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};