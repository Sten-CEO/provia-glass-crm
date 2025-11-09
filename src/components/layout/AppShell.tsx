import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";

const AppShell = () => {
  const { isCollapsed, toggleCollapsed } = useSidebarCollapsed();

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar isOpen={!isCollapsed} />
      
      <div 
        className="flex-1 flex flex-col transition-all duration-200"
        style={{ 
          marginLeft: isCollapsed ? '72px' : '264px',
          width: `calc(100% - ${isCollapsed ? '72px' : '264px'})`
        }}
      >
        <Navbar onMenuClick={toggleCollapsed} />
        
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
