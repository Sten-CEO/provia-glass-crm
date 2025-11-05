import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
}

const navItems = [
  { title: "Tableau de bord", icon: LayoutDashboard, path: "/tableau-de-bord" },
  { title: "Clients", icon: Users, path: "/clients" },
  { title: "Planning", icon: Calendar, path: "/planning" },
  { title: "Devis", icon: FileText, path: "/devis" },
  { title: "Factures", icon: Receipt, path: "/factures" },
  { title: "Jobs", icon: Briefcase, path: "/jobs" },
  { title: "Équipe", icon: UserCog, path: "/equipe" },
  { title: "Timesheets", icon: Clock, path: "/timesheets" },
  { title: "Paramètres", icon: Settings, path: "/parametres" },
  { title: "Support", icon: HelpCircle, path: "/support" },
];

const Sidebar = ({ isOpen }: SidebarProps) => {
  return (
    <aside
      className={cn(
        "glass-sidebar transition-all duration-300 h-screen sticky top-0 z-50",
        isOpen ? "w-64" : "w-0 lg:w-20",
        "overflow-hidden"
      )}
    >
      <div className="p-4 space-y-2 pt-6">
        {navItems.map((item) => (
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
    </aside>
  );
};

export default Sidebar;
