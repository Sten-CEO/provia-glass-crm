import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export const InstallPrompt = () => {
  const { canInstall, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!canInstall || dismissed) return null;

  return (
    <Card className="fixed bottom-20 left-4 right-4 p-4 shadow-lg z-40">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Installer l'application</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Accédez rapidement à vos interventions depuis votre écran d'accueil
          </p>
          
          <div className="flex gap-2">
            <Button onClick={handleInstall} size="sm">
              Installer
            </Button>
            <Button onClick={handleDismiss} variant="ghost" size="sm">
              Plus tard
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
