import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, Chrome, Share, Plus, MoreVertical } from "lucide-react";
import logo from "@/assets/logo.jpg";

const Download = () => {
  const [platform, setPlatform] = useState<"ios" | "android" | "unknown">("unknown");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 p-4">
        <div className="container mx-auto flex items-center gap-3">
          <img src={logo} alt="Provia BASE" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="font-bold text-lg">Provia BASE</h1>
            <p className="text-xs text-muted-foreground">Application Employe Terrain</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 mb-4">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Installer l'application mobile</h2>
          <p className="text-muted-foreground">
            Installez l'application sur votre telephone pour acceder a votre espace employe.
          </p>
        </div>

        {/* iOS Instructions */}
        <div className={`glass-card p-6 mb-6 ${platform === "ios" ? "ring-2 ring-primary" : ""}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">iPhone / iPad (Safari)</h3>
              {platform === "ios" && (
                <span className="text-xs text-primary font-medium">Votre appareil</span>
              )}
            </div>
          </div>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p>Ouvrez cette page dans <strong>Safari</strong></p>
                <p className="text-muted-foreground text-xs mt-1">L'installation ne fonctionne qu'avec Safari sur iOS</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
              <div className="flex items-center gap-2">
                <p>Appuyez sur le bouton <strong>Partager</strong></p>
                <Share className="w-5 h-5 text-blue-500" />
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
              <div className="flex items-center gap-2">
                <p>Selectionnez <strong>"Sur l'ecran d'accueil"</strong></p>
                <Plus className="w-5 h-5" />
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
              <p>Appuyez sur <strong>"Ajouter"</strong></p>
            </li>
          </ol>
        </div>

        {/* Android Instructions */}
        <div className={`glass-card p-6 mb-6 ${platform === "android" ? "ring-2 ring-primary" : ""}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Chrome className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Android (Chrome)</h3>
              {platform === "android" && (
                <span className="text-xs text-primary font-medium">Votre appareil</span>
              )}
            </div>
          </div>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p>Ouvrez cette page dans <strong>Chrome</strong></p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
              <div className="flex items-center gap-2">
                <p>Appuyez sur le menu <strong>(3 points)</strong></p>
                <MoreVertical className="w-5 h-5" />
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
              <p>Selectionnez <strong>"Installer l'application"</strong> ou <strong>"Ajouter a l'ecran d'accueil"</strong></p>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
              <p>Confirmez en appuyant sur <strong>"Installer"</strong></p>
            </li>
          </ol>
        </div>

        {/* Login Link */}
        <div className="glass-card p-6 text-center">
          <h3 className="font-semibold mb-2">Deja installe ?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connectez-vous avec les identifiants fournis par votre employeur.
          </p>
          <Button
            onClick={() => window.location.href = "/employee/login"}
            className="bg-primary hover:bg-primary/90"
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Acceder a l'espace employe
          </Button>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Qu'est-ce qu'une PWA ?</strong><br />
            Une Progressive Web App (PWA) est une application web qui s'installe sur votre telephone comme une application native. Elle fonctionne hors ligne et vous envoie des notifications.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 p-4 text-center text-sm text-muted-foreground">
        <p>Provia BASE - Application Employe Terrain</p>
      </footer>
    </div>
  );
};

export default Download;
