import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
  ChevronDown,
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("pv_sidebar_expanded");
    return saved ? JSON.parse(saved) : {};
  });

  const effectiveCollapsed = !isOpen;

  useEffect(() => {
    localStorage.setItem("pv_sidebar_expanded", JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSection = (path: string) => {
    setExpandedSections(prev => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <aside
      className={cn(
        "glass-sidebar transition-all duration-300 h-screen sticky top-0 z-50 flex flex-col border-r border-border/50",
        effectiveCollapsed ? "w-20" : "w-64",
        "overflow-hidden"
      )}
    >
      {/* Toggle button - hidden when sidebar closed */}
      {isOpen && (
        <div className="p-4 flex items-center justify-between border-b border-border/50">
          <span className="text-sm font-semibold tracking-wide">MENU</span>
        </div>
      )}

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
                const isExpanded = expandedSections[item.path];
                
                return (
                  <div key={item.path}>
                    <div className="flex items-center gap-1">
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
                        <>
                          <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all flex-1",
                                "hover:bg-primary/10",
                                isActive
                                  ? "bg-primary/20 text-foreground font-semibold shadow-sm"
                                  : "text-muted-foreground"
                              )
                            }
                          >
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm whitespace-nowrap flex-1">{item.title}</span>
                          </NavLink>
                          {hasSubFunctions && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0"
                              onClick={() => toggleSection(item.path)}
                            >
                              <ChevronDown 
                                className={cn(
                                  "h-4 w-4 transition-transform duration-200",
                                  isExpanded && "rotate-180"
                                )}
                              />
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Sub-functions accordion */}
                    {hasSubFunctions && isExpanded && !effectiveCollapsed && (
                      <div className="ml-8 mt-1 space-y-1 border-l border-border/30 pl-3">
                        {item.subFunctions?.map((subItem) => (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                                "hover:bg-primary/5",
                                isActive
                                  ? "bg-primary/10 text-foreground font-medium"
                                  : "text-muted-foreground"
                              )
                            }
                          >
                            {subItem.label}
                          </NavLink>
                        ))}
                      </div>
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

    </aside>
  );
};

export default Sidebar;
