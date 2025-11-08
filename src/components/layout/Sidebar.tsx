import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
}

const navSections = [
  {
    label: "OPÉRATIONS",
    items: [
      { title: "Tableau de bord", icon: LayoutDashboard, path: "/tableau-de-bord" },
      { title: "Planning", icon: Calendar, path: "/planning" },
      { title: "Jobs", icon: Briefcase, path: "/jobs" },
      { title: "Timesheets", icon: Clock, path: "/timesheets" },
    ],
  },
  {
    label: "RELATIONNEL",
    items: [
      { title: "Clients", icon: Users, path: "/clients" },
      { title: "Devis", icon: FileText, path: "/devis" },
      { title: "Factures", icon: Receipt, path: "/factures" },
      { title: "Paiements", icon: Receipt, path: "/paiements" },
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

  return (
    <aside
      className={cn(
        "glass-sidebar transition-all duration-300 h-screen sticky top-0 z-50",
        isOpen ? "w-64" : "w-0 lg:w-20",
        "overflow-hidden"
      )}
    >
      <div className="p-4 space-y-1 pt-6">
        {/* Create Button */}
        {isOpen && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full mb-4 gap-2">
                <Plus className="h-4 w-4" />
                Créer
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
              <DropdownMenuItem onClick={() => navigate("/jobs")}>
                <BriefcaseIcon className="h-4 w-4 mr-2" />
                Nouveau Job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/factures")}>
                <ReceiptIcon className="h-4 w-4 mr-2" />
                Nouvelle Facture
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isOpen && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="w-full mb-4">
                <Plus className="h-4 w-4" />
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
              <DropdownMenuItem onClick={() => navigate("/jobs")}>
                <BriefcaseIcon className="h-4 w-4 mr-2" />
                Nouveau Job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/factures")}>
                <ReceiptIcon className="h-4 w-4 mr-2" />
                Nouvelle Facture
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Navigation Sections */}
        {navSections.map((section, idx) => (
          <div key={section.label}>
            {isOpen && (
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground/60 px-3 mt-4 mb-2 font-medium">
                {section.label}
              </div>
            )}
            {!isOpen && idx > 0 && <div className="my-3 border-t border-border/50" />}
            
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      "hover:bg-primary/10 hover:translate-x-1",
                      isActive
                        ? "bg-primary/20 text-foreground font-semibold shadow-sm"
                        : "text-muted-foreground"
                    )
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {isOpen && (
                    <span className="text-sm whitespace-nowrap">{item.title}</span>
                  )}
                </NavLink>
              ))}
            </div>

            {isOpen && idx < navSections.length - 1 && (
              <div className="my-3 border-t border-border/50" />
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
