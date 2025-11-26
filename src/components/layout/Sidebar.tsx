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
  ChevronLeft,
  ChevronRight,
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
import { useAccessControls } from "@/hooks/useAccessControls";
import logo from "@/assets/logo.jpg";

interface SidebarProps {
  isOpen: boolean;
}

const navSections = [
  {
    label: "OPÉRATIONS",
    items: [
      { title: "Tableau de bord", icon: LayoutDashboard, path: "/tableau-de-bord", accessKey: "tableau_de_bord" },
      { title: "Planning", icon: Calendar, path: "/planning", accessKey: "planning" },
      { title: "Agenda", icon: Calendar, path: "/agenda", accessKey: "agenda" },
      {
        title: "Interventions",
        icon: Briefcase,
        path: "/interventions",
        accessKey: "jobs",
        subFunctions: [
          { label: "Historique & rapport", path: "/interventions/history" },
        ]
      },
      {
        title: "Pointage",
        icon: Clock,
        path: "/timesheets",
        accessKey: "timesheets",
        subFunctions: [
          { label: "Employés", path: "/pointage/employes" },
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
        accessKey: "clients",
        subFunctions: [
          { label: "Contrats", path: "/contracts" },
        ]
      },
      { title: "Devis", icon: FileText, path: "/devis", accessKey: "devis" },
      { title: "Factures", icon: Receipt, path: "/factures", accessKey: "factures" },
      { title: "Paiements", icon: Receipt, path: "/paiements", accessKey: "paiements" },
    ],
  },
  {
    label: "RESSOURCES",
    items: [
      {
        title: "Inventaire",
        icon: Package,
        path: "/inventaire",
        accessKey: "inventaire",
        subFunctions: [
          { label: "Consommables", path: "/inventaire/consommables" },
          { label: "Matériels", path: "/inventaire/materiels" },
          { label: "Mouvements", path: "/inventaire/mouvements" },
          { label: "Achats", path: "/inventaire/achats" },
        ]
      },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [
      { title: "Équipe", icon: UserCog, path: "/equipe", accessKey: "equipe" },
      { title: "Paramètres", icon: Settings, path: "/parametres", accessKey: "parametres" },
      { title: "Support", icon: HelpCircle, path: "/support" }, // No access control for support
    ],
  },
];

const Sidebar = ({ isOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const { isCollapsed, toggleCollapsed } = useSidebarCollapsed();
  const { hasAccess, userRole, accessControls } = useAccessControls();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("pv_sidebar_expanded");
    return saved ? JSON.parse(saved) : {};
  });

  // Debug: Log access controls when they change
  useEffect(() => {
    console.log('🔒 Sidebar - Access Controls:', accessControls);
    console.log('👤 Sidebar - User Role:', userRole);
  }, [accessControls, userRole]);

  // Don't use effectiveCollapsed, use isCollapsed directly

  useEffect(() => {
    localStorage.setItem("pv_sidebar_expanded", JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSection = (path: string) => {
    setExpandedSections(prev => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <aside
      className={cn(
        "glass-sidebar transition-all duration-300 h-screen sticky top-0 z-50 flex flex-col border-r border-border/50 flex-shrink-0",
        !isOpen && "hidden",
        isCollapsed ? "w-[72px]" : "w-[264px]",
        "overflow-hidden"
      )}
    >
      {/* Header with logo */}
      <div className={cn(
        "p-3 flex items-center border-b border-border/50",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <div className={cn(
          "flex items-center",
          !isCollapsed && "ml-2"
        )}>
          <img 
            src={logo} 
            alt="Provia Base" 
            className={cn(
              "object-contain rounded-lg",
              isCollapsed ? "w-10 h-10" : "w-12 h-12"
            )} 
          />
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="shrink-0 h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="absolute -right-4 top-4 h-7 w-7 rounded-full border border-border bg-background shadow-md z-10 hover:scale-110 transition-transform"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-1 overflow-y-auto flex-1">
        {/* Navigation Sections */}
        {navSections.map((section, idx) => {
          // Filter items based on access controls
          const filteredItems = section.items.filter((item: any) => {
            // If item has no accessKey, always show (like Support)
            if (!item.accessKey) return true;
            // Otherwise check if user has access
            return hasAccess(item.accessKey);
          });

          // Don't render section if no items left after filtering
          if (filteredItems.length === 0) return null;

          return (
          <div key={section.label}>
            {!isCollapsed && (
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground/60 px-3 mt-4 mb-2 font-medium">
                {section.label}
              </div>
            )}
            {isCollapsed && idx > 0 && <div className="my-3 border-t border-border/50" />}

            <div className="space-y-1">
              {filteredItems.map((item: any) => {
                const hasSubFunctions = item.subFunctions && item.subFunctions.length > 0;
                const isExpanded = expandedSections[item.path];

                return (
                  <div key={item.path}>
                    <div className="flex items-center gap-1">
                      {isCollapsed ? (
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
                    {hasSubFunctions && isExpanded && !isCollapsed && (
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

            {!isCollapsed && idx < navSections.length - 1 && (
              <div className="my-3 border-t border-border/50" />
            )}
          </div>
          );
        })}
      </div>

    </aside>
  );
};

export default Sidebar;
