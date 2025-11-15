import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Download, ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

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

interface MonthlyData {
  name: string;
  date: string;
  ca_ht: number;
  ca_ttc: number;
}

export default function CADetail() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const [viewMode, setViewMode] = useState<'emis' | 'encaisse'>('emis');
  const [chartData, setChartData] = useState<any[]>([]);
  const [clientsData, setClientsData] = useState<ClientCA[]>([]);
  const [totalCA, setTotalCA] = useState({ ht: 0, ttc: 0 });

  useEffect(() => {
    loadCAData();
  }, [period, viewMode]);

  const loadCAData = async () => {
    // Calculer la plage de dates selon la période
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'quarter':
        startDate = subMonths(now, 3);
        break;
      case 'year':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subMonths(now, 12);
    }

    // Charger les factures
    const dateField = viewMode === 'emis' ? 'issue_date' : 'paid_at';
    const { data: invoices } = await supabase
      .from('factures')
      .select('*, clients:client_id(nom)')
      .gte(dateField, startDate.toISOString())
      .order(dateField, { ascending: true });

    if (invoices) {
      // Grouper par mois
      const monthlyMap = new Map<string, { ca_ht: number; ca_ttc: number }>();
      
      invoices.forEach((invoice) => {
        const date = invoice[dateField];
        if (!date) return;
        
        const monthKey = format(new Date(date), 'MMM yyyy', { locale: fr });
        const existing = monthlyMap.get(monthKey) || { ca_ht: 0, ca_ttc: 0 };
        
        monthlyMap.set(monthKey, {
          ca_ht: existing.ca_ht + (invoice.total_ht || 0),
          ca_ttc: existing.ca_ttc + (invoice.total_ttc || 0),
        });
      });

      // Convertir en tableau pour le graphique
      const chartArray: MonthlyData[] = Array.from(monthlyMap.entries()).map(([name, data]) => ({
        name,
        date: name,
        ca_ht: data.ca_ht,
        ca_ttc: data.ca_ttc,
      }));

      setChartData(chartArray);

      // Calculer le total
      const totals = chartArray.reduce((acc, curr) => ({
        ht: acc.ht + curr.ca_ht,
        ttc: acc.ttc + curr.ca_ttc,
      }), { ht: 0, ttc: 0 });
      setTotalCA(totals);

      // Grouper par client
      const clientMap = new Map<string, ClientCA>();
      
      invoices.forEach((invoice) => {
        const clientId = invoice.client_id || 'unknown';
        const clientName = (invoice.clients as any)?.nom || invoice.client_nom || 'Client inconnu';
        
        const existing = clientMap.get(clientId) || {
          client_id: clientId,
          client_name: clientName,
          ca_ht: 0,
          ca_ttc: 0,
          invoices_sent: 0,
          invoices_paid: 0,
          invoices_to_send: 0,
          unpaid: 0,
          expenses: 0,
          margin: 0,
        };

        existing.ca_ht += invoice.total_ht || 0;
        existing.ca_ttc += invoice.total_ttc || 0;
        
        if (invoice.sent_at) existing.invoices_sent++;
        if (invoice.paid_at) existing.invoices_paid++;
        if (!invoice.sent_at && invoice.statut !== 'Brouillon') existing.invoices_to_send++;
        if (invoice.sent_at && !invoice.paid_at) existing.unpaid += invoice.total_ttc || 0;

        clientMap.set(clientId, existing);
      });

      const clientsArray = Array.from(clientMap.values()).sort((a, b) => b.ca_ttc - a.ca_ttc);
      setClientsData(clientsArray);
    }
  };

  const exportToCSV = () => {
    const headers = ['Client', 'CA HT', 'CA TTC', 'Factures Envoyées', 'Factures Payées', 'À Envoyer', 'Impayés'];
    const rows = clientsData.map(client => [
      client.client_name,
      client.ca_ht.toFixed(2),
      client.ca_ttc.toFixed(2),
      client.invoices_sent,
      client.invoices_paid,
      client.invoices_to_send,
      client.unpaid.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ca_detail_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Chiffre d'Affaires Détaillé</h1>
            <p className="text-muted-foreground">
              Analyse financière et performance par client
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mois</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Année</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={viewMode === 'emis' ? 'default' : 'outline'}
            onClick={() => setViewMode('emis')}
          >
            CA Émis
          </Button>
          <Button
            variant={viewMode === 'encaisse' ? 'default' : 'outline'}
            onClick={() => setViewMode('encaisse')}
          >
            CA Encaissé
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
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
