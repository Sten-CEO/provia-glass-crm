import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Quote {
  id: string;
  numero: string;
  client: string;
  montant: string;
  statut: "Brouillon" | "Envoyé" | "Accepté" | "Refusé";
}

const initialQuotes: Quote[] = [
  { id: "1", numero: "DEV-2024-001", client: "Entreprise ABC", montant: "€2,500", statut: "Envoyé" },
  { id: "2", numero: "DEV-2024-002", client: "Société XYZ", montant: "€4,200", statut: "Accepté" },
  { id: "3", numero: "DEV-2024-003", client: "Client Premium", montant: "€1,800", statut: "Brouillon" },
];

const Devis = () => {
  const [quotes] = useState<Quote[]>(initialQuotes);

  const getStatusColor = (statut: Quote["statut"]) => {
    switch (statut) {
      case "Accepté": return "bg-green-500/20 text-green-700";
      case "Envoyé": return "bg-blue-500/20 text-blue-700";
      case "Brouillon": return "bg-gray-500/20 text-gray-700";
      case "Refusé": return "bg-red-500/20 text-red-700";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Devis</h1>
        <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Devis
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Numéro</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Client</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Montant</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="border-b border-white/5 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4 font-medium">{quote.numero}</td>
                  <td className="p-4 text-muted-foreground">{quote.client}</td>
                  <td className="p-4 font-semibold">{quote.montant}</td>
                  <td className="p-4">
                    <Badge className={getStatusColor(quote.statut)}>
                      {quote.statut}
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

export default Devis;
