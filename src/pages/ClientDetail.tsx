import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/clients")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold uppercase tracking-wide">
          Entreprise ABC
        </h1>
      </div>

      <Tabs defaultValue="infos" className="space-y-6">
        <TabsList className="glass-card">
          <TabsTrigger value="infos" className="uppercase tracking-wide">Infos générales</TabsTrigger>
          <TabsTrigger value="historique" className="uppercase tracking-wide">Historique</TabsTrigger>
          <TabsTrigger value="pieces" className="uppercase tracking-wide">Pièces jointes</TabsTrigger>
        </TabsList>

        <TabsContent value="infos" className="glass-card p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Nom</p>
              <p className="font-semibold">Entreprise ABC</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Email</p>
              <p className="font-semibold">contact@abc.com</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Téléphone</p>
              <p className="font-semibold">01 23 45 67 89</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Ville</p>
              <p className="font-semibold">Paris</p>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline">Modifier</Button>
            <Button variant="destructive">Supprimer</Button>
          </div>
        </TabsContent>

        <TabsContent value="historique" className="glass-card p-6">
          <p className="text-muted-foreground">Aucun historique pour le moment</p>
        </TabsContent>

        <TabsContent value="pieces" className="glass-card p-6">
          <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold">
            Téléverser une pièce jointe
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetail;
