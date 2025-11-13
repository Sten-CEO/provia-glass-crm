import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClientCA {
  client_id: string;
  client_name: string;
  ca_ht: number;
  ca_ttc: number;
  invoices_sent: number;
  invoices_paid: number;
  invoices_to_send: number;
  unpaid: number;
  expenses: number;
  margin: number;
}

export default function CADetail() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [viewMode, setViewMode] = useState<'global' | 'by_client'>('global');
  const [chartData, setChartData] = useState<any[]>([]);
  const [clientsData, setClientsData] = useState<ClientCA[]>([]);

  useEffect(() => {
    loadCAData();
  }, [period, viewMode]);

  const loadCAData = async () => {
    // Charger les données de CA
    const { data: invoices } = await supabase
      .from('factures')
      .select('*');

    if (invoices) {
      // Préparer les données pour le graphique
      const mockChartData = [
        { name: 'Jan', CA_HT: 45000, CA_TTC: 54000 },
        { name: 'Fév', CA_HT: 52000, CA_TTC: 62400 },
        { name: 'Mar', CA_HT: 48000, CA_TTC: 57600 },
        { name: 'Avr', CA_HT: 61000, CA_TTC: 73200 },
        { name: 'Mai', CA_HT: 55000, CA_TTC: 66000 },
        { name: 'Juin', CA_HT: 67000, CA_TTC: 80400 },
      ];
      setChartData(mockChartData);

      // Préparer les données par client
      const mockClientsData: ClientCA[] = [
        {
          client_id: '1',
          client_name: 'Client A',
          ca_ht: 125000,
          ca_ttc: 150000,
          invoices_sent: 12,
          invoices_paid: 10,
          invoices_to_send: 3,
          unpaid: 15000,
          expenses: 85000,
          margin: 40000,
        },
        {
          client_id: '2',
          client_name: 'Client B',
          ca_ht: 98000,
          ca_ttc: 117600,
          invoices_sent: 8,
          invoices_paid: 7,
          invoices_to_send: 2,
          unpaid: 12000,
          expenses: 65000,
          margin: 33000,
        },
      ];
      setClientsData(mockClientsData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chiffre d'Affaires Détaillé</h1>
          <p className="text-muted-foreground">
            Analyse financière et performance par client
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Jour</SelectItem>
              <SelectItem value="week">Semaine</SelectItem>
              <SelectItem value="month">Mois</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={viewMode === 'global' ? 'default' : 'outline'}
            onClick={() => setViewMode('global')}
          >
            Global
          </Button>
          <Button
            variant={viewMode === 'by_client' ? 'default' : 'outline'}
            onClick={() => setViewMode('by_client')}
          >
            Par client
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Évolution du CA</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="CA_HT" stroke="#FBCB45" strokeWidth={2} name="CA HT" />
            <Line type="monotone" dataKey="CA_TTC" stroke="#8884d8" strokeWidth={2} name="CA TTC" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {viewMode === 'by_client' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Performance par client</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>CA HT</TableHead>
                <TableHead>CA TTC</TableHead>
                <TableHead>Factures</TableHead>
                <TableHead>Impayés</TableHead>
                <TableHead>Dépenses</TableHead>
                <TableHead>Marge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientsData.map((client) => (
                <TableRow key={client.client_id} className="cursor-pointer hover:bg-accent">
                  <TableCell className="font-medium">{client.client_name}</TableCell>
                  <TableCell>{client.ca_ht.toLocaleString()} €</TableCell>
                  <TableCell>{client.ca_ttc.toLocaleString()} €</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50">
                        {client.invoices_paid} payées
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50">
                        {client.invoices_sent} envoyées
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-50">
                        {client.invoices_to_send} à envoyer
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {client.unpaid.toLocaleString()} €
                  </TableCell>
                  <TableCell>{client.expenses.toLocaleString()} €</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {client.margin > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={client.margin > 0 ? 'text-green-600' : 'text-red-600'}>
                        {client.margin.toLocaleString()} €
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
