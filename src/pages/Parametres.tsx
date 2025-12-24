import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Templates from "./parametres/Templates";
import ServiceCatalog from "./parametres/ServiceCatalog";
import Taxes from "./parametres/Taxes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { guidecrmCompanySaved } from "@/components/guidecrm"; // GUIDECRM

const Parametres = () => {
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [tva, setTva] = useState("");
  const [email, setEmail] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // SMTP Configuration States
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false); // false = STARTTLS (587), true = SSL/TLS (465)
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      // 1. Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user found");
        toast.error("Session expirée, veuillez vous reconnecter");
        return;
      }

      // 2. Récupérer le company_id depuis user_roles
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
        toast.error("Erreur lors du chargement de votre rôle");
        return;
      }

      if (!userRole?.company_id) {
        console.error("No company_id found for user");
        toast.error("Aucune société associée à votre compte. Veuillez contacter l'administrateur.");
        return;
      }

      setCompanyId(userRole.company_id);

      // 3. Charger les données depuis company_settings
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("company_id", userRole.company_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching company settings:", error);
        toast.error("Erreur lors du chargement des paramètres");
        return;
      }

      if (data) {
        setCompanyName(data.company_name || "");
        setSiret(data.siret || "");
        setTva(data.tva_intracom || "");
        setEmail(data.email || "");
        setEmailFrom(""); // Not in company_settings
        setTelephone(data.phone || "");
        setAdresse(data.address || "");
        setVille(data.city || "");
        setCodePostal(data.postal_code || "");
      }

      // Load SMTP settings from companies table (where Edge Functions read from)
      const { data: companyData } = await supabase
        .from("companies")
        .select("smtp_enabled, smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure, name, email, telephone, adresse, siret")
        .eq("id", userRole.company_id)
        .single();

      if (companyData) {
        // Use company data for fields that might be more up-to-date
        if (companyData.name && !data?.company_name) setCompanyName(companyData.name);
        if (companyData.email) setEmail(companyData.email);
        if (companyData.telephone) setTelephone(companyData.telephone);
        if (companyData.adresse) setAdresse(companyData.adresse);
        if (companyData.siret && !data?.siret) setSiret(companyData.siret);

        // SMTP Configuration from companies table
        setSmtpEnabled(companyData.smtp_enabled || false);
        setSmtpHost(companyData.smtp_host || "");
        setSmtpPort(companyData.smtp_port || 587);
        setSmtpUsername(companyData.smtp_username || "");
        setSmtpPassword(companyData.smtp_password || "");
        setSmtpSecure(companyData.smtp_secure ?? false);
      }

      if (!data) {
        // Create default settings if none exist
        const { error: insertError } = await supabase
          .from("company_settings")
          .insert({
            company_id: userRole.company_id,
            company_name: "Mon entreprise"
          });

        if (!insertError) {
          setCompanyName("Mon entreprise");
        }
      }
    } catch (error) {
      console.error("Error loading company settings:", error);
      toast.error("Erreur inattendue lors du chargement");
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      console.error("No companyId available for save");
      toast.error("Impossible de sauvegarder : société non trouvée. Rechargez la page.");
      return;
    }

    setLoading(true);

    try {
      // Mise à jour de company_settings
      const { error } = await supabase
        .from("company_settings")
        .update({
          company_name: companyName,
          siret: siret,
          tva_intracom: tva,
          email: email,
          phone: telephone,
          address: adresse,
          city: ville,
          postal_code: codePostal,
          updated_at: new Date().toISOString()
        })
        .eq("company_id", companyId);

      if (error) {
        console.error("Erreur update:", error);
        throw error;
      }

      // Update SMTP settings in companies table (Edge Functions read from here)
      // Only update SMTP columns to avoid schema issues
      const smtpUpdateData: Record<string, any> = {
        smtp_enabled: smtpEnabled,
        smtp_host: smtpHost || null,
        smtp_port: smtpPort || 587,
        smtp_username: smtpUsername || null,
        smtp_password: smtpPassword || null,
        smtp_secure: smtpSecure ?? false,
      };

      const { error: companyError } = await supabase
        .from("companies")
        .update(smtpUpdateData)
        .eq("id", companyId);

      if (companyError) {
        console.error("Error updating SMTP in companies:", companyError);
        // Check if it's a missing column error
        if (companyError.message?.includes("column") || companyError.code === "PGRST204") {
          toast.error("Colonnes SMTP manquantes. Exécutez la migration SQL dans Supabase Dashboard.");
          // Don't throw - basic settings were saved
        } else {
          throw companyError;
        }
      } else {
        toast.success("Paramètres enregistrés avec succès");
      }

      // GUIDECRM: Mark company step as complete
      guidecrmCompanySaved();

      // Déclencher la mise à jour du nom de l'entreprise dans le header
      window.dispatchEvent(new Event('company-updated'));

      // Recharger pour vérifier
      await loadCompanySettings();
    } catch (error: any) {
      console.error("Erreur complète:", error);
      toast.error("Erreur lors de l'enregistrement: " + (error.message || "Inconnue"));
    } finally {
      setLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-smtp');

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || 'Email de test envoyé avec succès');
      } else {
        toast.error(data?.error || 'Échec du test SMTP');
      }
    } catch (error: any) {
      console.error('Error testing SMTP:', error);
      toast.error(error.message || 'Erreur lors du test SMTP');
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold uppercase tracking-wide">Paramètres</h1>

      <Tabs defaultValue="societe" className="space-y-6">
        <TabsList className="glass-card">
          <TabsTrigger value="societe" data-onboarding="tab-societe" className="uppercase tracking-wide">Société</TabsTrigger>
          <TabsTrigger value="email" className="uppercase tracking-wide">Email (SMTP)</TabsTrigger>
          <TabsTrigger value="modeles" data-onboarding="tab-modeles" className="uppercase tracking-wide">Modèles</TabsTrigger>
          <TabsTrigger value="catalogue" className="uppercase tracking-wide">Catalogue</TabsTrigger>
          <TabsTrigger value="taxes" className="uppercase tracking-wide">Taxes</TabsTrigger>
          <TabsTrigger value="rgpd" className="uppercase tracking-wide">RGPD</TabsTrigger>
        </TabsList>

        <TabsContent value="societe" className="glass-card p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="nom">Nom de la société</Label>
              <Input
                id="nom"
                placeholder="Entreprise"
                className="glass-card"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                placeholder="123 456 789 00010"
                className="glass-card"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tva">Numéro TVA</Label>
              <Input
                id="tva"
                placeholder="FR12345678901"
                className="glass-card"
                value={tva}
                onChange={(e) => setTva(e.target.value)}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email principal</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@entreprise.com"
                    className="glass-card"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilisé comme reply-to dans les emails de devis/factures
                  </p>
                </div>
                <div>
                  <Label htmlFor="emailFrom">Email d'expédition (optionnel)</Label>
                  <Input
                    id="emailFrom"
                    type="email"
                    placeholder="noreply@entreprise.com"
                    className="glass-card"
                    value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si vide, l'email principal sera utilisé
                  </p>
                </div>
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="01 23 45 67 89"
                    className="glass-card"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4">Adresse</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="adresse">Adresse complète</Label>
                  <Input
                    id="adresse"
                    placeholder="123 Rue de la République"
                    className="glass-card"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="codePostal">Code postal</Label>
                    <Input
                      id="codePostal"
                      placeholder="75001"
                      className="glass-card"
                      value={codePostal}
                      onChange={(e) => setCodePostal(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      placeholder="Paris"
                      className="glass-card"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              data-onboarding="btn-save-company" /* GUIDECRM */
              className="bg-primary hover:bg-primary/90 text-foreground font-semibold w-full"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="email" className="glass-card p-6 space-y-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Mail className="h-6 w-6" />
                  Configuration SMTP
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Configurez votre propre serveur SMTP pour envoyer vos devis et factures depuis votre adresse email
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={smtpEnabled}
                  onCheckedChange={setSmtpEnabled}
                  id="smtp-enabled"
                />
                <Label htmlFor="smtp-enabled" className="font-semibold">
                  {smtpEnabled ? 'Activé' : 'Désactivé'}
                </Label>
              </div>
            </div>

            {/* Info Alert */}
            {!smtpEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Configuration SMTP désactivée</p>
                  <p>Activez la configuration SMTP pour envoyer vos devis et factures depuis votre propre adresse email (Gmail, Outlook, OVH, IONOS, etc.)</p>
                </div>
              </div>
            )}

            {smtpEnabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Configuration SMTP activée</p>
                  <p>Vos devis et factures seront envoyés depuis votre serveur SMTP configuré</p>
                </div>
              </div>
            )}

            {/* SMTP Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp-host">Serveur SMTP (Host)</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.gmail.com"
                    className="glass-card"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    disabled={!smtpEnabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Gmail: smtp.gmail.com, Outlook: smtp-mail.outlook.com, OVH: ssl0.ovh.net
                  </p>
                </div>
                <div>
                  <Label htmlFor="smtp-port">Port SMTP</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    placeholder="587"
                    className="glass-card"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                    disabled={!smtpEnabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    STARTTLS: 587, SSL/TLS: 465
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="smtp-security">Type de sécurité</Label>
                <Select
                  value={smtpSecure ? "ssl" : "starttls"}
                  onValueChange={(value) => setSmtpSecure(value === "ssl")}
                  disabled={!smtpEnabled}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starttls">STARTTLS (Port 587) - Recommandé</SelectItem>
                    <SelectItem value="ssl">SSL/TLS (Port 465)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  STARTTLS est recommandé pour Gmail, Outlook et la plupart des fournisseurs
                </p>
              </div>

              <div>
                <Label htmlFor="smtp-username">Email d'envoi (SMTP Username)</Label>
                <Input
                  id="smtp-username"
                  type="email"
                  placeholder="votre-email@gmail.com"
                  className="glass-card"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  disabled={!smtpEnabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  L'adresse email depuis laquelle vos devis et factures seront envoyés
                </p>
              </div>

              <div>
                <Label htmlFor="smtp-password">Mot de passe SMTP</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  placeholder="••••••••••••"
                  className="glass-card"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  disabled={!smtpEnabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pour Gmail: utilisez un "Mot de passe d'application" (App Password). Pour Outlook: votre mot de passe habituel.
                </p>
              </div>
            </div>

            {/* Guide Links */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-sm">📚 Guides de configuration</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <p><strong>Gmail:</strong> smtp.gmail.com, Port 587, STARTTLS - <a href="https://support.google.com/mail/answer/185833" target="_blank" className="text-blue-600 hover:underline">Créer un mot de passe d'application</a></p>
                <p><strong>Outlook/Hotmail:</strong> smtp-mail.outlook.com, Port 587, STARTTLS</p>
                <p><strong>OVH:</strong> ssl0.ovh.net, Port 587, STARTTLS</p>
                <p><strong>IONOS:</strong> smtp.ionos.fr, Port 587, STARTTLS</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                className="bg-primary hover:bg-primary/90 text-foreground font-semibold flex-1"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Enregistrement..." : "Enregistrer la configuration"}
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleTestSmtp}
                disabled={!smtpEnabled || testingSmtp || !smtpHost || !smtpUsername || !smtpPassword}
              >
                <Mail className="h-4 w-4" />
                {testingSmtp ? "Test en cours..." : "Tester l'envoi"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="modeles">
          <Templates />
        </TabsContent>

        <TabsContent value="catalogue">
          <ServiceCatalog />
        </TabsContent>

        <TabsContent value="taxes">
          <Taxes />
        </TabsContent>

        <TabsContent value="rgpd" className="glass-card p-6 space-y-4">
          <div className="space-y-4">
            <Button variant="outline">Exporter mes données</Button>
            <Button variant="destructive">Supprimer mon compte</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Parametres;
