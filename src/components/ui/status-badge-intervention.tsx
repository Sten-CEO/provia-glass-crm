import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, type InterventionStatus } from "@/lib/interventionStatuses";

interface StatusBadgeInterventionProps {
  status: InterventionStatus;
  className?: string;
}

export const StatusBadgeIntervention = ({ status, className }: StatusBadgeInterventionProps) => {
  const config = STATUS_CONFIG[status] || { 
    label: status, 
    bgColor: "bg-muted", 
    textColor: "text-muted-foreground" 
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.bgColor,
        config.textColor,
        "font-medium border-0",
        className
      )}
    >
      {config.label}
    </Badge>
  );
};
