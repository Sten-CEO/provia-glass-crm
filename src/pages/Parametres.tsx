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

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setCompanyName(data.company_name || "");
      setSiret(data.siret || "");
      setTva(data.tva_intracom || "");
      setSettingsId(data.id);
    }
  };

  const handleSave = async () => {
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
