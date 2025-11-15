import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  User, 
  TrendingUp, 
  Package, 
  FileText, 
  MessageSquare,
  Smartphone
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmployeeDetails {
  id: string;
  nom: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  user_id?: string;
  competences?: string[];
  note?: string;
  hourly_rate?: number;
  is_manager?: boolean;
  created_at: string;
}

interface InterventionStat {
  total: number;
  completed: number;
  in_progress: number;
}

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InterventionStat>({ total: 0, completed: 0, in_progress: 0 });
  const [editedEmployee, setEditedEmployee] = useState<Partial<EmployeeDetails>>({});
  const [activeTab, setActiveTab] = useState<'info' | 'performances'>('info');
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [interventionDetails, setInterventionDetails] = useState<any[]>([]);

  useEffect(() => {
    loadEmployee();
    loadStats();
    loadPerformanceData();
  }, [id]);

  const loadEmployee = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("equipe")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Erreur de chargement");
      console.error(error);
      navigate("/equipe");
      return;
    }

    setEmployee(data as EmployeeDetails);
    setEditedEmployee(data as EmployeeDetails);
    setLoading(false);
  };

  const loadStats = async () => {
    if (!id) return;

    const { data: assignments } = await supabase
      .from("intervention_assignments")
      .select("intervention_id")
      .eq("employee_id", id);

    if (assignments) {
      const interventionIds = assignments.map(a => a.intervention_id);
      
      const { data: interventions } = await supabase
        .from("jobs")
        .select("statut")
        .in("id", interventionIds);

      if (interventions) {
        setStats({
          total: interventions.length,
          completed: interventions.filter(i => i.statut === "Terminée").length,
          in_progress: interventions.filter(i => i.statut === "En cours").length,
        });
      }
    }
  };

  const loadPerformanceData = async () => {
    if (!id) return;

    // Charger les données de la vue employee_performance_v
    const { data: perfData } = await supabase
      .from('employee_performance_v' as any)
      .select('*')
      .eq('employee_id', id)
      .single();

    if (perfData) {
      setPerformanceData(perfData);
    }

    // Charger les détails des interventions
    const { data: assignments } = await supabase
      .from("intervention_assignments")
      .select("intervention_id")
      .eq("employee_id", id);

    if (assignments && assignments.length > 0) {
      const interventionIds = assignments.map(a => a.intervention_id);
      
      const { data: interventions } = await supabase
        .from("jobs")
        .select(`
          *,
          clients:client_id(nom),
          timesheets_entries(start_at, end_at, break_min)
        `)
        .in("id", interventionIds)
        .order('date', { ascending: false });

      if (interventions) {
        setInterventionDetails(interventions);
      }
    }
  };

  const handleSave = async () => {
    if (!id) return;

    const { error } = await supabase
      .from("equipe")
      .update(editedEmployee)
      .eq("id", id);

    if (error) {
      toast.error("Erreur de sauvegarde");
      console.error(error);
      return;
    }

    toast.success("Employé mis à jour");
    setIsEditing(false);
    loadEmployee();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/equipe")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{employee.nom}</h1>
              <p className="text-muted-foreground">{employee.email}</p>
            </div>
            {employee.user_id && (
              <Badge className="bg-success text-success-foreground">
                <Smartphone className="h-3 w-3 mr-1" />
                Accès app actif
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    {isEditing ? (
                      <Input
                        value={editedEmployee.nom || ""}
                        onChange={(e) => setEditedEmployee({ ...editedEmployee, nom: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm">{employee.nom}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={editedEmployee.email || ""}
                        onChange={(e) => setEditedEmployee({ ...editedEmployee, email: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm">{employee.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    {isEditing ? (
                      <Input
                        value={editedEmployee.phone || ""}
                        onChange={(e) => setEditedEmployee({ ...editedEmployee, phone: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm">{employee.phone || "Non renseigné"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle</Label>
                    {isEditing ? (
                      <Select
                        value={editedEmployee.role || ""}
                        onValueChange={(value) => setEditedEmployee({ ...editedEmployee, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employé terrain">Employé terrain</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">{employee.role}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    {isEditing ? (
                      <Select
                        value={editedEmployee.status || "active"}
                        onValueChange={(value) => setEditedEmployee({ ...editedEmployee, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Actif</SelectItem>
                          <SelectItem value="inactive">Inactif</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                        {employee.status === "active" ? "Actif" : "Inactif"}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Taux horaire (€)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedEmployee.hourly_rate || 0}
                        onChange={(e) => setEditedEmployee({ ...editedEmployee, hourly_rate: parseFloat(e.target.value) })}
                      />
                    ) : (
                      <p className="text-sm">{employee.hourly_rate || 0} €</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notes internes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedEmployee.note || ""}
                    onChange={(e) => setEditedEmployee({ ...editedEmployee, note: e.target.value })}
                    placeholder="Notes internes sur cet employé..."
                    className="min-h-[120px]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {employee.note || "Aucune note"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total interventions</span>
                    <span className="text-2xl font-bold">{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Terminées</span>
                    <Badge variant="default">{stats.completed}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">En cours</span>
                    <Badge className="bg-warning text-warning-foreground">{stats.in_progress}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Compétences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {employee.competences && employee.competences.length > 0 ? (
                    employee.competences.map((comp, idx) => (
                      <Badge key={idx} variant="secondary">
                        {comp}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune compétence renseignée</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Fonctionnalité à venir : gestion des documents RH
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
