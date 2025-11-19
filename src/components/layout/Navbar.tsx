import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsPanel } from "./NotificationsPanel";
import { QuickCreateMenu } from "./QuickCreateMenu";
import { SettingsMenu } from "./SettingsMenu";
import { useCompany } from "@/hooks/useCompany";
interface NavbarProps {
  onMenuClick: () => void;
}
const Navbar = ({
  onMenuClick
}: NavbarProps) => {
  const { company } = useCompany();
  return <nav className="glass-navbar h-16 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3 bg-yellow-50 px-3 py-1.5 rounded-sm">
          <span className="text-sm font-medium text-gray-600">Société:</span>
          <span className="font-bold uppercase tracking-wide text-gray-900">
            {company?.name || "Chargement..."}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationsPanel />
        <QuickCreateMenu />
        <SettingsMenu />
      </div>
    </nav>;
};
export default Navbar;