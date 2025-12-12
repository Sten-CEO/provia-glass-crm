import { useState, useEffect, useMemo } from "react";
import { Monitor, Smartphone, Apple, Download as DownloadIcon, Share, Plus, MoreVertical, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// GitHub repository info - update these for your repo
const GITHUB_OWNER = "Sten-CEO";
const GITHUB_REPO = "provia-glass-crm";

type DeviceType = "ios" | "android" | "desktop";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: ReleaseAsset[];
}

interface DownloadLinks {
  windows: string | null;
  macos: string | null;
  macosArm: string | null;
  version: string | null;
}

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

const useGitHubRelease = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLinks>({
    windows: null,
    macos: null,
    macosArm: null,
    version: null,
  });

  useEffect(() => {
    const fetchLatestRelease = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (response.status === 404) {
          setError("no-release");
          return;
        }

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const release: GitHubRelease = await response.json();

        // Find Windows and macOS assets
        let windowsUrl: string | null = null;
        let macosUrl: string | null = null;
        let macosArmUrl: string | null = null;

        for (const asset of release.assets) {
          const name = asset.name.toLowerCase();

          // Windows: .exe or .msi
          if (name.endsWith(".exe") || name.endsWith(".msi")) {
            if (!name.includes("arm")) {
              windowsUrl = asset.browser_download_url;
            }
          }

          // macOS: .dmg or .app.tar.gz
          if (name.endsWith(".dmg")) {
            if (name.includes("aarch64") || name.includes("arm")) {
              macosArmUrl = asset.browser_download_url;
            } else if (name.includes("x64") || name.includes("x86_64") || !name.includes("aarch")) {
              macosUrl = asset.browser_download_url;
            }
          }
        }

        // If only one macOS version, use it for both
        if (!macosUrl && macosArmUrl) macosUrl = macosArmUrl;
        if (!macosArmUrl && macosUrl) macosArmUrl = macosUrl;

        setDownloadLinks({
          windows: windowsUrl,
          macos: macosUrl,
          macosArm: macosArmUrl,
          version: release.tag_name,
        });
      } catch (err) {
        console.error("Failed to fetch release:", err);
        setError("fetch-error");
      } finally {
        setLoading(false);
      }
    };

    fetchLatestRelease();
  }, []);

  return { loading, error, downloadLinks };
};

// Simple QR Code generator using Google Charts API
const QRCode = ({ url, size = 128 }: { url: string; size?: number }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=1`;

  return (
    <img
      src={qrUrl}
      alt="QR Code pour l'app mobile"
      width={size}
      height={size}
      className="rounded-lg"
    />
  );
};

const Download = () => {
  const deviceType = useDeviceType();
  const { loading, error, downloadLinks } = useGitHubRelease();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Get production URL for QR code
  const employeeAppUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/employee`;
  }, []);

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

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
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

  const NoReleaseMessage = () => (
    <div className="text-center p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
        Aucune version disponible
      </p>
      <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
        La version desktop sera bientot disponible.
      </p>
    </div>
  );

  const DownloadButton = ({
    href,
    icon: Icon,
    label,
    variant = "default",
    disabled = false
  }: {
    href: string | null;
    icon: any;
    label: string;
    variant?: "default" | "outline";
    disabled?: boolean;
  }) => {
    if (!href || disabled) {
      return (
        <Button
          className="w-full h-12 text-base"
          variant={variant}
          disabled
        >
          <Icon className="w-5 h-5 mr-2" />
          {label}
        </Button>
      );
    }

    return (
      <Button
        className="w-full h-12 text-base"
        variant={variant}
        asChild
      >
        <a href={href} download>
          <Icon className="w-5 h-5 mr-2" />
          {label}
        </a>
      </Button>
    );
  };

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
              {downloadLinks.version && (
                <span className="inline-block mt-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                  Version {downloadLinks.version}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : error === "no-release" ? (
                <NoReleaseMessage />
              ) : error ? (
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Erreur lors du chargement des telechargements.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    <DownloadButton
                      href={downloadLinks.windows}
                      icon={DownloadIcon}
                      label="Telecharger pour Windows"
                      disabled={!downloadLinks.windows}
                    />
                    <DownloadButton
                      href={downloadLinks.macos}
                      icon={Apple}
                      label="Telecharger pour macOS"
                      variant="outline"
                      disabled={!downloadLinks.macos}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    Windows 10+ / macOS 10.13+
                  </p>
                </>
              )}
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
                    <p className="text-sm text-muted-foreground mb-4">
                      Scannez ce QR code avec votre telephone pour installer l'app terrain.
                    </p>
                    <div className="flex justify-center">
                      <div className="bg-white p-2 rounded-lg shadow-inner">
                        <QRCode url={employeeAppUrl} size={128} />
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Ou visitez <strong className="font-mono">{employeeAppUrl}</strong> sur votre telephone
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
