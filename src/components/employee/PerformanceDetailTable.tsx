import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Intervention {
  id: string;
  date: string;
  titre: string;
  client_nom: string;
  statut: string;
  heure_debut: string | null;
  heure_fin: string | null;
  lieu: string | null;
  duration_actual: number | null;
}

interface PerformanceDetailTableProps {
  employeeId: string;
}

export const PerformanceDetailTable = ({ employeeId }: PerformanceDetailTableProps) => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [period, setPeriod] = useState<string>("30");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadInterventions();

    const channel = supabase
      .channel('employee-interventions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `employe_id=eq.${employeeId}`
      }, () => {
        loadInterventions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, period, statusFilter]);

  const loadInterventions = async () => {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

    let query = supabase
      .from('jobs')
      .select('*')
      .or(`employe_id.eq.${employeeId},assigned_employee_ids.cs.{${employeeId}}`)
      .gte('date', daysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('statut', statusFilter);
    }

    const { data } = await query;
    if (data) {
      setInterventions(data);
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'Terminée': return 'bg-green-500';
      case 'En cours': return 'bg-blue-500';
      case 'À faire': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
            <SelectItem value="365">1 an</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="À faire">À faire</SelectItem>
            <SelectItem value="En cours">En cours</SelectItem>
            <SelectItem value="Terminée">Terminée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Lieu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interventions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Aucune intervention pour cette période
                </TableCell>
              </TableRow>
            ) : (
              interventions.map((intervention) => (
                <TableRow key={intervention.id}>
                  <TableCell>{format(new Date(intervention.date), 'dd MMM yyyy', { locale: fr })}</TableCell>
                  <TableCell className="font-medium">{intervention.titre}</TableCell>
                  <TableCell>{intervention.client_nom}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(intervention.statut)}>
                      {intervention.statut}
                    </Badge>
                  </TableCell>
                  <TableCell>{intervention.heure_debut || '-'}</TableCell>
                  <TableCell>{intervention.heure_fin || '-'}</TableCell>
                  <TableCell>{formatDuration(intervention.duration_actual)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{intervention.lieu || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
