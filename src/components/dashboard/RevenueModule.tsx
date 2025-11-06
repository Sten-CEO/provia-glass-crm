import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarIcon, Eye, EyeOff } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Period = "jour" | "semaine" | "30jours" | "personnalise";
type DisplayMode = "brut" | "net";

export const RevenueModule = () => {
  const [visible, setVisible] = useState(true);
  const [period, setPeriod] = useState<Period>("30jours");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("brut");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [revenue, setRevenue] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const savedVisible = localStorage.getItem("revenueModuleVisible");
    if (savedVisible !== null) {
      setVisible(savedVisible === "true");
    }
  }, []);

  useEffect(() => {
    loadRevenueData();

    // Subscribe to real-time changes on factures
    const channel = supabase
      .channel("revenue-factures-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "factures" }, () => {
        loadRevenueData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [period, displayMode, dateRange]);

  const loadRevenueData = async () => {
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "jour":
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date());
        break;
      case "semaine":
        startDate = startOfWeek(new Date(), { locale: fr });
        endDate = endOfWeek(new Date(), { locale: fr });
        break;
      case "30jours":
        startDate = subDays(new Date(), 30);
        endDate = new Date();
        break;
      case "personnalise":
        startDate = dateRange.from;
        endDate = dateRange.to;
        break;
    }

    const { data: factures } = await supabase
      .from("factures")
      .select("*")
      .eq("statut", "Payée")
      .gte("date_paiement", startDate.toISOString())
      .lte("date_paiement", endDate.toISOString());

    if (factures) {
      const total = factures.reduce((sum, f) => {
        const amount = displayMode === "brut" ? (f.total_ttc || 0) : (f.total_ht || 0);
        return sum + Number(amount);
      }, 0);
      setRevenue(total);

      // Generate chart data
      const grouped = factures.reduce((acc: any, f) => {
        const date = format(new Date(f.date_paiement || f.created_at), "dd/MM");
        const amount = displayMode === "brut" ? (f.total_ttc || 0) : (f.total_ht || 0);
        acc[date] = (acc[date] || 0) + Number(amount);
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([date, value]) => ({
        date,
        revenue: value,
      }));
      setChartData(chartData);
    }
  };

  const toggleVisible = () => {
    const newVisible = !visible;
    setVisible(newVisible);
    localStorage.setItem("revenueModuleVisible", String(newVisible));
  };

  if (!visible) {
    return (
      <Button
        onClick={toggleVisible}
        variant="outline"
        size="sm"
        className="glass-card mb-6"
      >
        <Eye className="h-4 w-4 mr-2" />
        Afficher le module CA
      </Button>
    );
  }

  return (
    <Card className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wide">Chiffre d'affaires</h2>
          <p className="text-4xl font-bold mt-2">{revenue.toFixed(2)} €</p>
          <p className="text-sm text-muted-foreground mt-1">
            {displayMode === "brut" ? "TTC" : "HT"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px] glass-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-modal">
              <SelectItem value="jour">Jour</SelectItem>
              <SelectItem value="semaine">Semaine</SelectItem>
              <SelectItem value="30jours">30 derniers jours</SelectItem>
              <SelectItem value="personnalise">Personnalisé</SelectItem>
            </SelectContent>
          </Select>

          {period === "personnalise" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="glass-card">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 glass-modal">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          <Select value={displayMode} onValueChange={(v) => setDisplayMode(v as DisplayMode)}>
            <SelectTrigger className="w-[120px] glass-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-modal">
              <SelectItem value="brut">Brut (TTC)</SelectItem>
              <SelectItem value="net">Net (HT)</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={toggleVisible} variant="ghost" size="icon">
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
