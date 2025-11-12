import { useNavigate, useLocation } from "react-router-dom";
import { Home, Briefcase, Calendar, Clock, HelpCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const EmployeeTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/employee",
      exactMatch: true,
    },
    {
      id: "jobs",
      label: "Jobs",
      icon: Briefcase,
      path: "/employee/jobs",
    },
    {
      id: "planning",
      label: "Planning",
      icon: Calendar,
      path: "/employee/planning",
    },
    {
      id: "timesheets",
      label: "Pointage",
      icon: Clock,
      path: "/employee/timesheets",
    },
    {
      id: "support",
      label: "Support",
      icon: HelpCircle,
      path: "/employee/support",
    },
    {
      id: "profile",
      label: "Profil",
      icon: User,
      path: "/employee/profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-border/40 safe-area-bottom" aria-label="Navigation employé">
      <div className="grid grid-cols-6 gap-1 px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exactMatch 
            ? location.pathname === tab.path
            : location.pathname.startsWith(tab.path) && location.pathname !== "/employee";

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
