import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { AuthGuard } from "./AuthGuard";

const AppShell = () => {
  const { isCollapsed, toggleCollapsed } = useSidebarCollapsed();

  return (
    <AuthGuard>
      <div className="min-h-screen flex w-full">
        <Sidebar isOpen={!isCollapsed} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onMenuClick={toggleCollapsed} />
          
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AppShell;
