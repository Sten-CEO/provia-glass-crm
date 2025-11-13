import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Employee {
  id: string;
  nom: string;
  email: string;
  role: string;
  app_access_status: string;
}

export default function Employes() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadEmployees();

    const channel = supabase
      .channel('employees-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'equipe'
      }, () => {
        loadEmployees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('equipe')
      .select('*')
      .order('nom');

    if (data) {
      setEmployees(data);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.nom.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employés</h1>
          <p className="text-muted-foreground">
            Gestion des employés et historique de pointage
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un employé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Heures ce mois</TableHead>
              <TableHead>Heures facturables</TableHead>
              <TableHead>Accès app</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow
                key={employee.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => navigate(`/pointage/employes/${employee.id}`)}
              >
                <TableCell className="font-medium">{employee.nom}</TableCell>
                <TableCell>
                  <Badge variant="outline">{employee.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>0h</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>0h</span>
                  </div>
                </TableCell>
                <TableCell>
                  {employee.app_access_status === 'active' ? (
                    <Badge className="bg-green-500">Actif</Badge>
                  ) : employee.app_access_status === 'suspended' ? (
                    <Badge variant="destructive">Suspendu</Badge>
                  ) : (
                    <Badge variant="outline">Aucun</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/pointage/employes/${employee.id}`);
                    }}
                  >
                    Voir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
