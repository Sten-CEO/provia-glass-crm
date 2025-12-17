import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { AuthGuard } from "./AuthGuard";
import { AssistantBubble } from "@/components/assistant/AssistantBubble";
// GUIDECRM: Import gamified onboarding system
import { GuidecrmProvider, Guidecrm } from "@/components/guidecrm";

const AdminLayout = () => {
  const { toggleCollapsed } = useSidebarCollapsed();

  return (
    <AuthGuard>
      {/* GUIDECRM: Wrap with provider for onboarding state */}
      <GuidecrmProvider>
        <div className="min-h-screen flex w-full">
          <Sidebar isOpen={true} data-testid="admin-sidebar" />

          <div className="flex-1 flex flex-col min-w-0">
            <Navbar onMenuClick={toggleCollapsed} />

            <main className="flex-1 p-6 overflow-auto">
              <Outlet />
            </main>
          </div>

          {/* Assistant bulle visible sur toutes les pages CRM */}
          <AssistantBubble />

          {/* GUIDECRM: Gamified onboarding guide */}
          <Guidecrm />
        </div>
      </GuidecrmProvider>
    </AuthGuard>
  );
};

export default AdminLayout;
