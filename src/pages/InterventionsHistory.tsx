import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadgeIntervention } from "@/components/ui/status-badge-intervention";
import { type InterventionStatus } from "@/lib/interventionStatuses";
import { Search, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Intervention {
  id: string;
  titre: string;
  client_nom: string;
  employe_nom: string;
  statut: InterventionStatus;
  date: string;
  adresse?: string;
  intervention_number?: string;
}

export default function InterventionsHistory() {
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadInterventions();
  }, []);

  const loadInterventions = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setInterventions((data || []) as unknown as Intervention[]);
  };

  const filteredInterventions = interventions.filter(intervention => {
    const matchesSearch = search === "" || 
      intervention.titre.toLowerCase().includes(search.toLowerCase()) ||
      intervention.client_nom.toLowerCase().includes(search.toLowerCase()) ||
      (intervention.adresse && intervention.adresse.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "all" || intervention.statut === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Historique & Rapport</h1>
          <p className="text-muted-foreground">Consultez le détail de vos interventions</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une intervention..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="À planifier">À planifier</SelectItem>
                  <SelectItem value="À faire">À faire</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
                  <SelectItem value="Terminée">Terminée</SelectItem>
                  <SelectItem value="Annulée">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <div className="space-y-3">
          {filteredInterventions.map((intervention) => (
            <Card 
              key={intervention.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/interventions/${intervention.id}/report`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{intervention.titre}</h3>
                      <StatusBadgeIntervention status={intervention.statut} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{intervention.client_nom}</span>
                      <span>•</span>
                      <span>{new Date(intervention.date).toLocaleDateString("fr-FR")}</span>
                      {intervention.intervention_number && (
                        <>
                          <span>•</span>
                          <span>{intervention.intervention_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInterventions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Aucune intervention trouvée
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
