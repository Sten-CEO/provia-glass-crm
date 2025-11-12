import { useNavigate, useLocation } from "react-router-dom";
import { ClipboardList, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const EmployeeTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: "interventions",
      label: "Interventions",
      icon: ClipboardList,
      path: "/employee/interventions",
    },
    {
      id: "timesheets",
      label: "Pointage",
      icon: Clock,
      path: "/employee/timesheets",
    },
    {
      id: "profile",
      label: "Profil",
      icon: User,
      path: "/employee/profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-border/40 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname.startsWith(tab.path);

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
