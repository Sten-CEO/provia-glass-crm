import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/jobs")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold uppercase tracking-wide">
          Installation système
        </h1>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Client</p>
            <p className="font-semibold">Entreprise ABC</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Employé</p>
            <p className="font-semibold">Jean Dupont</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Date</p>
            <p className="font-semibold">05/12/2024</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Statut</p>
            <p className="font-semibold">En cours</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Notes internes</p>
          <p className="text-muted-foreground">Aucune note pour le moment</p>
        </div>

        <div className="flex gap-4">
          <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold">
            Marquer terminé
          </Button>
          <Button variant="outline">Modifier</Button>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
