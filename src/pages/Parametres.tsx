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
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
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
        return;
      }

      if (!userRole?.company_id) {
        console.error("No company_id found for user");
        toast.error("Aucune société associée à votre compte");
        return;
      }

      setCompanyId(userRole.company_id);

      // 3. Charger les paramètres de la société
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("company_id", userRole.company_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching company settings:", error);
        return;
      }

      if (data) {
        setCompanyName(data.company_name || "");
        setSiret(data.siret || "");
        setTva(data.tva_intracom || "");
        setSettingsId(data.id);
      } else {
        console.log("No company settings found, will create on save");
      }
    } catch (error) {
      console.error("Error loading company settings:", error);
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error("Impossible de sauvegarder : société non trouvée");
      return;
    }

    setLoading(true);
    
    try {
      if (settingsId) {
        // Mise à jour
        const { error } = await supabase
          .from("company_settings")
          .update({
            company_name: companyName,
            siret: siret,
            tva_intracom: tva,
            updated_at: new Date().toISOString()
          })
          .eq("id", settingsId);

        if (error) {
          console.error("Erreur update:", error);
          throw error;
        }
      } else {
        // Création
        const { data, error } = await supabase
          .from("company_settings")
          .insert({
            company_id: companyId,
            company_name: companyName,
            siret: siret,
            tva_intracom: tva,
          })
          .select()
          .single();

        if (error) {
          console.error("Erreur insert:", error);
          throw error;
        }
        if (data) setSettingsId(data.id);
      }

      toast.success("Paramètres enregistrés avec succès");
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
            <Button 
              className="bg-primary hover:bg-primary/90 text-foreground font-semibold"
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
