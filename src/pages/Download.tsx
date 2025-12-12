import { useState, useEffect } from "react";
import { Monitor, Smartphone, Apple, Download as DownloadIcon, Share, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DeviceType = "ios" | "android" | "desktop";

const useDeviceType = (): DeviceType => {
  const [device, setDevice] = useState<DeviceType>("desktop");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDevice("ios");
    } else if (/android/.test(userAgent)) {
      setDevice("android");
    } else {
      setDevice("desktop");
    }
  }, []);

  return device;
};

const Download = () => {
  const deviceType = useDeviceType();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  const InstallInstructionsiOS = () => (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h4 className="font-semibold text-sm mb-3">Installation sur iPhone / iPad</h4>
      <ol className="text-sm text-muted-foreground space-y-3">
        <li className="flex items-start gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
          <span>Ouvrez <strong>Safari</strong> et allez sur cette page</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
          <span className="flex items-center gap-1">
            Appuyez sur le bouton <Share className="w-4 h-4 inline" /> <strong>Partager</strong>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
          <span className="flex items-center gap-1">
            Selectionnez <Plus className="w-4 h-4 inline" /> <strong>Sur l'ecran d'accueil</strong>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
          <span>Confirmez en appuyant sur <strong>Ajouter</strong></span>
        </li>
      </ol>
    </div>
  );

  const InstallInstructionsAndroid = () => (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h4 className="font-semibold text-sm mb-3">Installation sur Android</h4>
      {isInstallable ? (
        <p className="text-sm text-muted-foreground mb-3">
          Cliquez sur le bouton ci-dessus pour installer l'application.
        </p>
      ) : (
        <ol className="text-sm text-muted-foreground space-y-3">
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
            <span>Ouvrez <strong>Chrome</strong> et allez sur cette page</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
            <span className="flex items-center gap-1">
              Appuyez sur <MoreVertical className="w-4 h-4 inline" /> le menu (3 points)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
            <span>Selectionnez <strong>Installer l'application</strong> ou <strong>Ajouter a l'ecran d'accueil</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
            <span>Confirmez l'installation</span>
          </li>
        </ol>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Provia BASE</h1>
              <p className="text-xs text-muted-foreground">CRM Premium</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Telecharger Provia BASE</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Accedez a votre CRM depuis n'importe ou. Installez l'application sur votre ordinateur ou votre telephone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* PC App Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-4">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Provia BASE - PC</CardTitle>
              <CardDescription>
                Installez le CRM comme un logiciel sur votre ordinateur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full h-12 text-base"
                  variant="default"
                  asChild
                >
                  <a href="/downloads/Provia-BASE-Setup.exe" download>
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Telecharger pour Windows
                  </a>
                </Button>
                <Button
                  className="w-full h-12 text-base"
                  variant="outline"
                  asChild
                >
                  <a href="/downloads/Provia-BASE.dmg" download>
                    <Apple className="w-5 h-5 mr-2" />
                    Telecharger pour macOS
                  </a>
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Windows 10+ / macOS 10.13+
              </p>
            </CardContent>
          </Card>

          {/* Mobile App Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Provia BASE - Terrain</CardTitle>
              <CardDescription>
                Installez l'app terrain sur votre telephone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deviceType === "desktop" ? (
                <>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Scannez ce QR code avec votre telephone ou ouvrez cette page sur votre appareil mobile.
                    </p>
                    <div className="mt-4 mx-auto w-32 h-32 bg-white p-2 rounded-lg shadow-inner flex items-center justify-center">
                      <div className="w-full h-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-400">QR Code</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Ou visitez <strong>/employee</strong> sur votre telephone
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {isInstallable && deviceType === "android" && (
                    <Button
                      className="w-full h-12 text-base bg-yellow-500 hover:bg-yellow-600 text-black"
                      onClick={handleInstallPWA}
                    >
                      <DownloadIcon className="w-5 h-5 mr-2" />
                      Installer sur telephone
                    </Button>
                  )}

                  {deviceType === "ios" ? (
                    <InstallInstructionsiOS />
                  ) : (
                    <InstallInstructionsAndroid />
                  )}

                  <Button
                    className="w-full h-12 text-base"
                    variant="outline"
                    asChild
                  >
                    <a href="/employee">
                      Ouvrir l'app terrain
                    </a>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">Pourquoi installer Provia BASE ?</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Acces rapide</h3>
              <p className="text-sm text-muted-foreground">Lancez le CRM directement depuis votre bureau ou ecran d'accueil</p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Securise</h3>
              <p className="text-sm text-muted-foreground">Vos donnees restent protegees avec notre infrastructure securisee</p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Toujours a jour</h3>
              <p className="text-sm text-muted-foreground">Les mises a jour sont automatiques, rien a reinstaller</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-white/50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Provia BASE. Tous droits reserves.</p>
        </div>
      </footer>
    </div>
  );
};

export default Download;
