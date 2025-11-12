import { Outlet } from "react-router-dom";
import { EmployeeTabBar } from "./EmployeeTabBar";
import { EmployeeHeader } from "./EmployeeHeader";
import { OfflineBanner } from "./OfflineBanner";
import { InstallPrompt } from "./InstallPrompt";
import { EmployeeProvider } from "@/contexts/EmployeeContext";

export const EmployeeLayout = () => {
  return (
    <EmployeeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <OfflineBanner />
        <EmployeeHeader />
        
        <main className="flex-1 overflow-auto pb-20">
          <Outlet />
        </main>

        <EmployeeTabBar />
        <InstallPrompt />
      </div>
    </EmployeeProvider>
  );
};
