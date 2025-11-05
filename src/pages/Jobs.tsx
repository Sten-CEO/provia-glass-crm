import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Job {
  id: string;
  titre: string;
  client: string;
  employe: string;
  statut: "À faire" | "En cours" | "Terminé";
  date: string;
}

const initialJobs: Job[] = [
  { id: "1", titre: "Installation système", client: "Entreprise ABC", employe: "Jean Dupont", statut: "En cours", date: "05/12/2024" },
  { id: "2", titre: "Maintenance réseau", client: "Société XYZ", employe: "Marie Martin", statut: "À faire", date: "06/12/2024" },
  { id: "3", titre: "Audit sécurité", client: "Client Premium", employe: "Paul Bernard", statut: "Terminé", date: "04/12/2024" },
];

const Jobs = () => {
  const [jobs] = useState<Job[]>(initialJobs);
  const navigate = useNavigate();

  const getStatusColor = (statut: Job["statut"]) => {
    switch (statut) {
      case "Terminé": return "bg-green-500/20 text-green-700";
      case "En cours": return "bg-blue-500/20 text-blue-700";
      case "À faire": return "bg-gray-500/20 text-gray-700";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Jobs / Interventions</h1>
        <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Job
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Titre</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Client</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Employé</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Date</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-white/5 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <td className="p-4 font-medium">{job.titre}</td>
                  <td className="p-4 text-muted-foreground">{job.client}</td>
                  <td className="p-4 text-muted-foreground">{job.employe}</td>
                  <td className="p-4 text-muted-foreground">{job.date}</td>
                  <td className="p-4">
                    <Badge className={getStatusColor(job.statut)}>
                      {job.statut}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm">Voir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
