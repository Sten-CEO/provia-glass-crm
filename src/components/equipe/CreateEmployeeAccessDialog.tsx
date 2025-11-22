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
  const [createdRole, setCreatedRole] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
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
      
      if (sessionError || !session) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
        return;
      }

      console.log("Creating employee access with session:", session.user.id);

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

      console.log("Response from edge function:", response);

      if (response.error) {
        console.error("Edge function error:", response.error);

        if (response.error.message?.includes('Unauthorized') ||
            response.error.message?.includes('Insufficient permissions')) {
          toast.error("Vous n'avez pas les permissions nécessaires");
        } else if (response.error.message?.includes('already registered')) {
          toast.error("Cet email est déjà utilisé");
        } else {
          toast.error(response.error.message || "Erreur lors de la création de l'accès");
        }
        return;
      }

      console.log("Edge function response data:", response.data);

      if (method === "password" && password) {
        setGeneratedPassword(password);
        setCreatedRole(response.data?.role || null);
        setCreatedEmail(response.data?.email || formData.email);
        toast.success("Accès créé avec succès");
      } else {
        toast.success("Invitation envoyée par email");
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error creating access:", error);
      toast.error("Erreur lors de la création de l'accès");
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
    setCreatedRole(null);
    setCreatedEmail(null);
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
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-500">
              <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                ✅ Compte créé avec succès dans Supabase Auth!
              </p>
              <p className="text-xs text-green-800 dark:text-green-300">
                L'utilisateur peut maintenant se connecter.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email de connexion</Label>
              <div className="p-2 bg-muted rounded font-mono text-sm">
                {createdEmail}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Mot de passe temporaire</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded font-mono text-sm break-all">
                  {generatedPassword}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyPassword}
                  title="Copier le mot de passe"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-500">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                🔐 Page de connexion à utiliser:
              </p>
              {createdRole === 'employe_terrain' ? (
                <div className="space-y-2">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    Cet employé doit se connecter sur l'<strong>application employé</strong>:
                  </p>
                  <div className="p-2 bg-white dark:bg-gray-800 rounded font-mono text-xs break-all">
                    {window.location.origin}/employee/login
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/employee/login`);
                      toast.success("URL copiée!");
                    }}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier l'URL de connexion
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    Cet employé doit se connecter sur le <strong>CRM</strong> (pas l'app employé):
                  </p>
                  <div className="p-2 bg-white dark:bg-gray-800 rounded font-mono text-xs break-all">
                    {window.location.origin}/auth/login
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/auth/login`);
                      toast.success("URL copiée!");
                    }}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier l'URL de connexion
                  </Button>
                </div>
              )}
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-500">
              <p className="text-sm text-yellow-900 dark:text-yellow-200">
                ⚠️ <strong>Important:</strong> Ce mot de passe ne sera plus visible après fermeture.
                Copiez-le maintenant et transmettez-le de manière sécurisée à l'employé.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                J'ai copié les informations
              </Button>
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