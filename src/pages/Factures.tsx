import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: string;
  numero: string;
  client: string;
  montant: string;
  statut: "Payée" | "En attente" | "En retard";
  echeance: string;
}

const initialInvoices: Invoice[] = [
  { id: "1", numero: "FAC-2024-001", client: "Entreprise ABC", montant: "€2,500", statut: "Payée", echeance: "15/12/2024" },
  { id: "2", numero: "FAC-2024-002", client: "Société XYZ", montant: "€4,200", statut: "En attente", echeance: "20/12/2024" },
  { id: "3", numero: "FAC-2024-003", client: "Client Premium", montant: "€1,800", statut: "En retard", echeance: "10/11/2024" },
];

const Factures = () => {
  const [invoices] = useState<Invoice[]>(initialInvoices);

  const getStatusColor = (statut: Invoice["statut"]) => {
    switch (statut) {
      case "Payée": return "bg-green-500/20 text-green-700";
      case "En attente": return "bg-blue-500/20 text-blue-700";
      case "En retard": return "bg-red-500/20 text-red-700";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Factures</h1>
        <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Facture
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
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Échéance</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-white/5 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4 font-medium">{invoice.numero}</td>
                  <td className="p-4 text-muted-foreground">{invoice.client}</td>
                  <td className="p-4 font-semibold">{invoice.montant}</td>
                  <td className="p-4 text-muted-foreground">{invoice.echeance}</td>
                  <td className="p-4">
                    <Badge className={getStatusColor(invoice.statut)}>
                      {invoice.statut}
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

export default Factures;
