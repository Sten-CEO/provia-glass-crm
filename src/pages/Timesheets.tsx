import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Timesheet {
  id: string;
  employe: string;
  job: string;
  debut: string;
  fin: string;
  total: string;
}

const initialTimesheets: Timesheet[] = [
  { id: "1", employe: "Jean Dupont", job: "Installation système", debut: "09:00", fin: "17:00", total: "8h" },
  { id: "2", employe: "Marie Martin", job: "Maintenance réseau", debut: "08:00", fin: "12:00", total: "4h" },
  { id: "3", employe: "Paul Bernard", job: "Audit sécurité", debut: "14:00", fin: "18:00", total: "4h" },
];

const Timesheets = () => {
  const [timesheets] = useState<Timesheet[]>(initialTimesheets);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Timesheets</h1>
        <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
          <Plus className="mr-2 h-4 w-4" />
          Pointer
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Employé</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Job</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Début</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Fin</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Total</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map((timesheet) => (
                <tr
                  key={timesheet.id}
                  className="border-b border-white/5 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4 font-medium">{timesheet.employe}</td>
                  <td className="p-4 text-muted-foreground">{timesheet.job}</td>
                  <td className="p-4 text-muted-foreground">{timesheet.debut}</td>
                  <td className="p-4 text-muted-foreground">{timesheet.fin}</td>
                  <td className="p-4 font-semibold">{timesheet.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Timesheets;
