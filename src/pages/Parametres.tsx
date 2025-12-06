import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Templates from "./parametres/Templates";
import ServiceCatalog from "./parametres/ServiceCatalog";
import Taxes from "./parametres/Taxes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

      console.log("User ID:", user.id);

      // 2. Récupérer le company_id depuis user_roles
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("User role data:", userRole);
      console.log("Role error:", roleError);

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

      console.log("Company ID found:", userRole.company_id);
      setCompanyId(userRole.company_id);

      // 3. Charger les données de la société
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", userRole.company_id)
        .maybeSingle();

      console.log("Company data:", data);
      console.log("Company error:", error);

      if (error) {
        console.error("Error fetching company:", error);
        toast.error("Erreur lors du chargement des paramètres");
        return;
      }

      if (data) {
        setCompanyName(data.name || "");
        setSiret(data.siret || "");
        setTva(data.tva_intracom || "");
        setEmail(data.email || "");
        setEmailFrom(data.email_from || "");
        setTelephone(data.telephone || "");
        setAdresse(data.adresse || "");
        setVille(data.ville || "");
        setCodePostal(data.code_postal || "");
        console.log("Company data loaded successfully");
      } else {
        console.log("No company found");
        toast.error("Société non trouvée");
      }
    } catch (error) {
      console.error("Error loading company settings:", error);
      toast.error("Erreur inattendue lors du chargement");
    }
  };

  const handleSave = async () => {
    console.log("HandleSave called, companyId:", companyId);

    if (!companyId) {
      console.error("No companyId available for save");
      toast.error("Impossible de sauvegarder : société non trouvée. Rechargez la page.");
      return;
    }

    setLoading(true);

    try {
      // Mise à jour de la société
      console.log("Updating company:", companyId);
      const { error } = await supabase
        .from("companies")
        .update({
          name: companyName,
          siret: siret,
          tva_intracom: tva,
          email: email,
          email_from: emailFrom,
          telephone: telephone,
          adresse: adresse,
          ville: ville,
          code_postal: codePostal,
          updated_at: new Date().toISOString()
        })
        .eq("id", companyId);

      if (error) {
        console.error("Erreur update:", error);
        throw error;
      }
      console.log("Update successful");

      toast.success("Paramètres enregistrés avec succès");

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
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold uppercase tracking-wide">Paramètres</h1>

      <Tabs defaultValue="societe" className="space-y-6">
        <TabsList className="glass-card">
          <TabsTrigger value="societe" className="uppercase tracking-wide">Société</TabsTrigger>
          <TabsTrigger value="modeles" className="uppercase tracking-wide">Modèles</TabsTrigger>
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
              className="bg-primary hover:bg-primary/90 text-foreground font-semibold w-full"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
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
