import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";

const Planning = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Planning</h1>
        <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Job
        </Button>
      </div>

      <div className="glass-card p-6 min-h-[600px]">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">Vue Planning</p>
            <p className="text-muted-foreground">
              Calendrier multi-ressources avec drag & drop
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Planning;
