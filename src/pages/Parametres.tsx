import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Templates from "./parametres/Templates";
import ServiceCatalog from "./parametres/ServiceCatalog";

const Parametres = () => {
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
              <Input id="nom" placeholder="Entreprise" className="glass-card" />
            </div>
            <div>
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" placeholder="123 456 789 00010" className="glass-card" />
            </div>
            <div>
              <Label htmlFor="tva">Numéro TVA</Label>
              <Input id="tva" placeholder="FR12345678901" className="glass-card" />
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold">
              Enregistrer
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="modeles">
          <Templates />
        </TabsContent>

        <TabsContent value="catalogue">
          <ServiceCatalog />
        </TabsContent>

        <TabsContent value="taxes" className="glass-card p-6">
          <p className="text-muted-foreground">Configuration des taxes et de la numérotation</p>
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
