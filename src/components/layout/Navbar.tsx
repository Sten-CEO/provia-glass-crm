import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import logo from "@/assets/logo.jpg";
import { NotificationsPanel } from "./NotificationsPanel";
import { QuickCreateMenu } from "./QuickCreateMenu";
import { SettingsMenu } from "./SettingsMenu";
import { supabase } from "@/integrations/supabase/client";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });
  }, []);

  return (
    <nav className="glass-navbar h-16 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <img src={logo} alt="Provia Base" className="w-8 h-8 object-contain" />
          <span className="font-bold uppercase tracking-wide">Entreprise</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {userEmail}
        </span>
        <NotificationsPanel />
        <QuickCreateMenu />
        <SettingsMenu />
      </div>
    </nav>
  );
};

export default Navbar;
