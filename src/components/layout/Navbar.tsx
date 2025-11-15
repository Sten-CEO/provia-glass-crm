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
const Navbar = ({
  onMenuClick
}: NavbarProps) => {
  const [companyName, setCompanyName] = useState<string>("Votre Entreprise");
  useEffect(() => {
    loadCompanyName();

    // Écouter les changements en temps réel
    const channel = supabase.channel('company-settings-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'company_settings'
    }, () => {
      loadCompanyName();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const loadCompanyName = async () => {
    const {
      data
    } = await supabase.from("company_settings").select("company_name").limit(1).single();
    if (data?.company_name) {
      setCompanyName(data.company_name);
    }
  };
  return <nav className="glass-navbar h-16 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3 bg-yellow-50 rounded-sm">
          
          <span className="font-bold uppercase tracking-wide">{companyName}</span>
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