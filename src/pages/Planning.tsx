import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Menu } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

const Planning = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  
  // Load filters from localStorage
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem("planning_filters");
    return saved ? JSON.parse(saved) : {
      statut: "all",
      employe: "all",
      type: "all",
      zone: "all",
    };
  });
  
  const [newJob, setNewJob] = useState({
    titre: "",
    client_id: "",
    employe_id: "",
    date: "",
    heure_debut: "09:00",
    heure_fin: "17:00",
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("planning_filters", JSON.stringify(filters));
  }, [filters]);

  // Get unique values for filters
  const uniqueTypes = useMemo(
    () => Array.from(new Set(allJobs.map(j => j.type).filter(Boolean))),
    [allJobs]
  );
  const uniqueZones = useMemo(
    () => Array.from(new Set(allJobs.map(j => j.zone).filter(Boolean))),
    [allJobs]
  );

  useEffect(() => {
    loadJobs();
    loadEmployes();
    loadClients();

    const channel = supabase
      .channel("planning-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        loadJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadJobs = async () => {
    const { data } = await supabase.from("jobs").select("*");
    if (data) {
      setAllJobs(data);
      applyFilters(data);
    }
  };

  const applyFilters = (jobs: any[]) => {
    const filtered = jobs.filter(job => {
      const matchesStatut = filters.statut === "all" || job.statut === filters.statut;
      const matchesEmploye = filters.employe === "all" || job.employe_id === filters.employe;
      const matchesType = filters.type === "all" || job.type === filters.type;
      const matchesZone = filters.zone === "all" || job.zone === filters.zone;
      
      return matchesStatut && matchesEmploye && matchesType && matchesZone;
    });

    const formattedEvents = filtered.map((job) => ({
      id: job.id,
      title: `${job.titre} - ${job.client_nom}`,
      start: `${job.date}T${job.heure_debut || "09:00"}`,
      end: `${job.date}T${job.heure_fin || "17:00"}`,
      resourceId: job.employe_id,
      backgroundColor: job.statut === "Terminé" ? "#10b981" : job.statut === "En cours" ? "#3b82f6" : "#6b7280",
    }));
    
    setEvents(formattedEvents);
  };

  // Re-apply filters when filter values change
  useEffect(() => {
    if (allJobs.length > 0) {
      applyFilters(allJobs);
    }
  }, [filters]);

  const loadEmployes = async () => {
    const { data } = await supabase.from("equipe").select("*");
    if (data) {
      const formattedResources = data.map((emp) => ({
        id: emp.id,
        title: emp.nom,
      }));
      setResources(formattedResources);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("*");
    setClients(data || []);
  };

  const handleDateClick = (info: any) => {
    setNewJob({ ...newJob, date: info.dateStr });
    setOpen(true);
  };

  const handleEventDrop = async (info: any) => {
    const newDate = info.event.startStr.split("T")[0];
    const newHeureDebut = info.event.startStr.split("T")[1]?.substring(0, 5) || "09:00";
    const newHeureFin = info.event.endStr?.split("T")[1]?.substring(0, 5) || "17:00";
    const newEmployeId = info.event.getResources()[0]?.id;

    // Get current job to check its status
    const { data: currentJob } = await supabase
      .from("jobs")
      .select("statut")
      .eq("id", info.event.id)
      .single();

    // Build update object - change status to "À faire" if it was "À planifier"
    const updates: any = {
      date: newDate,
      heure_debut: newHeureDebut,
      heure_fin: newHeureFin,
      employe_id: newEmployeId || null,
    };

    if (currentJob?.statut === "À planifier") {
      updates.statut = "À faire";
    }

    const { error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", info.event.id);

    if (error) {
      toast.error("Erreur lors du déplacement");
      info.revert();
    } else {
      toast.success(currentJob?.statut === "À planifier" ? "Job planifié et prêt" : "Job déplacé");
      loadJobs(); // Reload to update the view
    }
  };

  const handleAddJob = async () => {
    if (!newJob.titre || !newJob.client_id || !newJob.employe_id) {
      toast.error("Tous les champs requis");
      return;
    }

    const client = clients.find((c) => c.id === newJob.client_id);
    const employe = resources.find((e) => e.id === newJob.employe_id);

    const { error } = await supabase.from("jobs").insert([
      {
        titre: newJob.titre,
        client_id: newJob.client_id,
        client_nom: client?.nom || "",
        employe_id: newJob.employe_id,
        employe_nom: employe?.title || "",
        statut: "À faire",
        date: newJob.date,
        heure_debut: newJob.heure_debut,
        heure_fin: newJob.heure_fin,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Job créé avec succès");
    setNewJob({
      titre: "",
      client_id: "",
      employe_id: "",
      date: "",
      heure_debut: "09:00",
      heure_fin: "17:00",
    });
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Planning</h1>
        <Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Intervention
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Statut</Label>
            <Select value={filters.statut} onValueChange={(v) => setFilters({ ...filters, statut: v })}>
              <SelectTrigger className="glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="À faire">À faire</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Terminé">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Employé</Label>
            <Select value={filters.employe} onValueChange={(v) => setFilters({ ...filters, employe: v })}>
              <SelectTrigger className="glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {resources.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
            <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
              <SelectTrigger className="glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Zone</Label>
            <Select value={filters.zone} onValueChange={(v) => setFilters({ ...filters, zone: v })}>
              <SelectTrigger className="glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {uniqueZones.map(zone => (
                  <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimelinePlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          editable={true}
          droppable={true}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          eventClick={(info) => navigate(`/interventions/${info.event.id}/report`)}
          height="auto"
          locale="fr"
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">Nouvelle Intervention</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                placeholder="Installation système"
                value={newJob.titre}
                onChange={(e) => setNewJob({ ...newJob, titre: e.target.value })}
                className="glass-card"
              />
            </div>
            <div>
              <Label>Client *</Label>
              <Select value={newJob.client_id} onValueChange={(v) => setNewJob({ ...newJob, client_id: v })}>
                <SelectTrigger className="glass-card">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employé *</Label>
              <Select value={newJob.employe_id} onValueChange={(v) => setNewJob({ ...newJob, employe_id: v })}>
                <SelectTrigger className="glass-card">
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((employe) => (
                    <SelectItem key={employe.id} value={employe.id}>
                      {employe.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={newJob.date}
                onChange={(e) => setNewJob({ ...newJob, date: e.target.value })}
                className="glass-card"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Heure début</Label>
                <Input
                  type="time"
                  value={newJob.heure_debut}
                  onChange={(e) => setNewJob({ ...newJob, heure_debut: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Heure fin</Label>
                <Input
                  type="time"
                  value={newJob.heure_fin}
                  onChange={(e) => setNewJob({ ...newJob, heure_fin: e.target.value })}
                  className="glass-card"
                />
              </div>
            </div>
            <Button onClick={handleAddJob} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Planning;
