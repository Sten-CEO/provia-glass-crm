import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

interface Intervention {
  id: string;
  titre: string;
  client_nom: string;
  adresse: string;
  date: string;
  heure_debut: string;
  statut: string;
  description: string;
}

export const EmployeeInterventions = () => {
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterventions();
  }, []);

  const loadInterventions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/employee/login");
        return;
      }

      // Load interventions assigned to this user
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .contains("assigned_employee_ids", [user.id])
        .order("date", { ascending: true });

      if (error) throw error;
      setInterventions(data || []);
    } catch (error: any) {
      toast.error("Erreur de chargement des interventions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "À faire": return "bg-blue-100 text-blue-800";
      case "En cours": return "bg-yellow-100 text-yellow-800";
      case "Terminée": return "bg-green-100 text-green-800";
      case "Annulée": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Mes interventions</h2>
        <Badge variant="secondary">{interventions.length} interventions</Badge>
      </div>

      {interventions.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucune intervention assignée
        </Card>
      ) : (
        <div className="space-y-3">
          {interventions.map((intervention) => (
            <Card
              key={intervention.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/employee/interventions/${intervention.id}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{intervention.titre}</h3>
                <Badge className={getStatusColor(intervention.statut)}>
                  {intervention.statut}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {intervention.client_nom}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{intervention.date}</span>
                </div>

                {intervention.heure_debut && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{intervention.heure_debut}</span>
                  </div>
                )}

                {intervention.adresse && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{intervention.adresse}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
