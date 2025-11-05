import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  id: string;
  nom: string;
  role: "Owner" | "Admin" | "Membre";
  email: string;
}

const initialTeam: TeamMember[] = [
  { id: "1", nom: "Jean Dupont", role: "Owner", email: "jean@entreprise.com" },
  { id: "2", nom: "Marie Martin", role: "Admin", email: "marie@entreprise.com" },
  { id: "3", nom: "Paul Bernard", role: "Membre", email: "paul@entreprise.com" },
];

const Equipe = () => {
  const [team] = useState<TeamMember[]>(initialTeam);

  const getRoleColor = (role: TeamMember["role"]) => {
    switch (role) {
      case "Owner": return "bg-primary/20 text-foreground";
      case "Admin": return "bg-secondary/20 text-foreground";
      case "Membre": return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Équipe</h1>
        <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
          <Plus className="mr-2 h-4 w-4" />
          Inviter un membre
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Nom</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Rôle</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Email</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-white/5 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4 font-medium">{member.nom}</td>
                  <td className="p-4">
                    <Badge className={getRoleColor(member.role)}>
                      {member.role}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground">{member.email}</td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm">Gérer</Button>
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

export default Equipe;
