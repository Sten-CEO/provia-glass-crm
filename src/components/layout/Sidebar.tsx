import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Receipt,
  Briefcase,
  UserCog,
  Clock,
  Settings,
  HelpCircle,
  Plus,
  UserPlus,
  FileTextIcon,
  BriefcaseIcon,
  ReceiptIcon,
  Package,
  Menu,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { SubFunctionsDrawer } from "@/components/layout/SubFunctionsDrawer";

interface SidebarProps {
  isOpen: boolean;
}

const navSections = [
  {
    label: "OPÉRATIONS",
    items: [
      { title: "Tableau de bord", icon: LayoutDashboard, path: "/tableau-de-bord" },
      { 
        title: "Planning", 
        icon: Calendar, 
        path: "/planning",
        subFunctions: [
          { label: "À faire", path: "/planning?filter=À faire" },
          { label: "En cours", path: "/planning?filter=En cours" },
          { label: "Terminé", path: "/planning?filter=Terminé" },
          { label: "Vue par employé", path: "/planning?view=employee" },
          { label: "Vue calendrier", path: "/planning?view=calendar" },
        ]
      },
      { 
        title: "Interventions", 
        icon: Briefcase, 
        path: "/interventions",
        subFunctions: [
          { label: "À planifier", path: "/interventions?filter=À faire" },
          { label: "En cours", path: "/interventions?filter=En cours" },
          { label: "Terminées", path: "/interventions?filter=Terminé" },
          { label: "Temps & coûts", path: "/timesheets" },
        ]
      },
      { 
        title: "Timesheets", 
        icon: Clock, 
        path: "/timesheets",
        subFunctions: [
          { label: "À approuver", path: "/timesheets?filter=submitted" },
          { label: "Brouillons", path: "/timesheets?filter=draft" },
          { label: "Approuvées", path: "/timesheets?filter=approved" },
          { label: "Export CSV", path: "/timesheets?action=export" },
          { label: "Rapport mensuel", path: "/timesheets?view=monthly" },
        ]
      },
    ],
  },
  {
    label: "RELATIONNEL",
    items: [
      { 
        title: "Clients", 
        icon: Users, 
        path: "/clients",
        subFunctions: [
          { label: "Contrats", path: "/clients?view=contrats" },
          { label: "Adresses", path: "/clients?view=adresses" },
          { label: "Contacts", path: "/clients?view=contacts" },
          { label: "Interventions", path: "/interventions" },
          { label: "Devis", path: "/devis" },
          { label: "Factures", path: "/factures" },
        ]
      },
      { 
        title: "Devis", 
        icon: FileText, 
        path: "/devis",
        subFunctions: [
          { label: "Brouillons", path: "/devis?filter=Brouillons" },
          { label: "Envoyés", path: "/devis?filter=Envoyés" },
          { label: "Acceptés", path: "/devis?filter=Acceptés" },
          { label: "Refusés", path: "/devis?filter=Refusés" },
          { label: "Expirés", path: "/devis?filter=Expirés" },
        ]
      },
      { 
        title: "Factures", 
        icon: Receipt, 
        path: "/factures",
        subFunctions: [
          { label: "En attente", path: "/factures?filter=En attente" },
          { label: "Payées", path: "/factures?filter=Payées" },
          { label: "En retard", path: "/factures?filter=En retard" },
          { label: "Échéances du mois", path: "/factures?filter=month" },
        ]
      },
      { title: "Paiements", icon: Receipt, path: "/paiements" },
    ],
  },
  {
    label: "RESSOURCES",
    items: [
      { 
        title: "Inventaire", 
        icon: Package, 
        path: "/inventaire",
        subFunctions: [
          { label: "Consommables", path: "/inventaire/consommables" },
          { label: "Matériels", path: "/inventaire/materiels" },
          { label: "Mouvements", path: "/inventaire/mouvements" },
          { label: "Achats", path: "/inventaire/achats" },
          { label: "Alertes stock", path: "/inventaire?filter=alerts" },
        ]
      },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [
      { title: "Équipe", icon: UserCog, path: "/equipe" },
      { title: "Paramètres", icon: Settings, path: "/parametres" },
      { title: "Support", icon: HelpCircle, path: "/support" },
    ],
  },
];

const Sidebar = ({ isOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const { isCollapsed, toggleCollapsed } = useSidebarCollapsed();
  const effectiveCollapsed = !isOpen ? true : isCollapsed;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerFunctions, setDrawerFunctions] = useState<Array<{ label: string; path: string }>>([]);

  const openDrawer = (title: string, functions: Array<{ label: string; path: string }>) => {
    setDrawerTitle(title);
    setDrawerFunctions(functions);
    setDrawerOpen(true);
  };

  return (
    <aside
      className={cn(
        "glass-sidebar transition-all duration-300 h-screen sticky top-0 z-50 flex flex-col border-r border-border/50",
        effectiveCollapsed ? "w-20" : "w-64",
        "overflow-hidden"
      )}
    >
      {/* Toggle button */}
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="shrink-0"
          title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 space-y-1 overflow-y-auto flex-1">
        {/* Create Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className={cn("w-full mb-4", effectiveCollapsed ? "px-0" : "gap-2")}>
              <Plus className="h-4 w-4" />
              {!effectiveCollapsed && "Créer"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/clients")}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nouveau Client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/devis/new")}>
              <FileTextIcon className="h-4 w-4 mr-2" />
              Nouveau Devis
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/interventions")}>
              <BriefcaseIcon className="h-4 w-4 mr-2" />
              Nouvelle Intervention
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/factures")}>
              <ReceiptIcon className="h-4 w-4 mr-2" />
              Nouvelle Facture
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Navigation Sections */}
        {navSections.map((section, idx) => (
          <div key={section.label}>
            {!effectiveCollapsed && (
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground/60 px-3 mt-4 mb-2 font-medium">
                {section.label}
              </div>
            )}
            {effectiveCollapsed && idx > 0 && <div className="my-3 border-t border-border/50" />}
            
            <div className="space-y-1">
              {section.items.map((item) => {
                const hasSubFunctions = item.subFunctions && item.subFunctions.length > 0;
                
                return (
                  <div key={item.path} className={cn("flex items-center gap-1", effectiveCollapsed ? "" : "pr-2")}>
                    {effectiveCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center justify-center p-3 rounded-xl transition-all flex-1",
                                "hover:bg-primary/10",
                                isActive
                                  ? "bg-primary/20 text-foreground font-semibold shadow-sm"
                                  : "text-muted-foreground"
                              )
                            }
                          >
                            <item.icon className="h-5 w-5" />
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all flex-1",
                            "hover:bg-primary/10 hover:translate-x-1",
                            isActive
                              ? "bg-primary/20 text-foreground font-semibold shadow-sm"
                              : "text-muted-foreground"
                          )
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm whitespace-nowrap">{item.title}</span>
                      </NavLink>
                    )}

                    {hasSubFunctions && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size={effectiveCollapsed ? "icon" : "sm"}
                            className={cn(effectiveCollapsed ? "h-8 w-8" : "h-8 px-2", "shrink-0")}
                            onClick={(e) => {
                              e.preventDefault();
                              openDrawer(item.title, item.subFunctions || []);
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Sous-fonctions</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>

            {!effectiveCollapsed && idx < navSections.length - 1 && (
              <div className="my-3 border-t border-border/50" />
            )}
          </div>
        ))}
      </div>

      <SubFunctionsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={drawerTitle}
        subFunctions={drawerFunctions}
      />
    </aside>
  );
};

export default Sidebar;
