import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Devis
  "Brouillon": { label: "Brouillon", className: "bg-muted/50 text-muted-foreground border-muted" },
  "Envoyé": { label: "Envoyé", className: "bg-primary/10 text-primary border-primary/20" },
  "Accepté": { label: "Accepté", className: "bg-success/10 text-success border-success/20" },
  "Signé": { label: "Signé", className: "bg-success/10 text-success border-success/20" },
  "Refusé": { label: "Refusé", className: "bg-destructive/10 text-destructive border-destructive/20" },
  "Annulé": { label: "Annulé", className: "bg-muted/50 text-muted-foreground border-muted" },
  
  // Factures
  "Payée": { label: "Payée", className: "bg-success/10 text-success border-success/20" },
  "En attente": { label: "En attente", className: "bg-warning/10 text-warning border-warning/20" },
  "En retard": { label: "En retard", className: "bg-destructive/10 text-destructive border-destructive/20" },
  
  // Interventions
  "À faire": { label: "À faire", className: "bg-muted/50 text-muted-foreground border-muted" },
  "À planifier": { label: "À planifier", className: "bg-warning/10 text-warning border-warning/20" },
  "En cours": { label: "En cours", className: "bg-primary/10 text-primary border-primary/20" },
  "Terminé": { label: "Terminé", className: "bg-success/10 text-success border-success/20" },
  "Terminée": { label: "Terminée", className: "bg-success/10 text-success border-success/20" },
  "Assigné": { label: "Assigné", className: "bg-primary/10 text-primary border-primary/20" },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status, className: "bg-muted/50 text-muted-foreground" };
  
  return (
    <Badge variant="outline" className={cn(config.className, "font-medium", className)}>
      {config.label}
    </Badge>
  );
};
