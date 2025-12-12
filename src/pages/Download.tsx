import { useState, useEffect, useMemo } from "react";
import { Monitor, Smartphone, Apple, Download as DownloadIcon, Share, Plus, MoreVertical, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// GitHub repository info for fetching releases
const GITHUB_OWNER = "Sten-CEO";
const GITHUB_REPO = "provia-glass-crm";

// Optional: Direct download URLs (fallback if env vars are set)
const ENV_WINDOWS_URL = import.meta.env.VITE_WINDOWS_DOWNLOAD_URL;
const ENV_MACOS_URL = import.meta.env.VITE_MACOS_DOWNLOAD_URL;

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

        // Check if env vars are set (direct URLs)
        if (ENV_WINDOWS_URL || ENV_MACOS_URL) {
          setDownloadLinks({
            windows: ENV_WINDOWS_URL || null,
            macos: ENV_MACOS_URL || null,
            macosArm: ENV_MACOS_URL || null,
            version: "latest",
          });
          setLoading(false);
          return;
        }

        // Fetch from GitHub Releases API
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

          // macOS: .dmg
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

// QR Code component using external API
const QRCode = ({ url, size = 140 }: { url: string; size?: number }) => {
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
  const [isInstalled, setIsInstalled] = useState(false);

  // Get production URL for QR code
  const employeeAppUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/employee`;
  }, []);

  // Check if PWA is already installed
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for app installed event
    const installedHandler = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
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
    <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Apple className="w-4 h-4" />
        Installation sur iPhone / iPad
      </h4>
      <ol className="text-sm text-muted-foreground space-y-3">
        <li className="flex items-start gap-2">
          <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 font-medium">1</span>
          <span>Ouvrez cette page dans <strong>Safari</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 font-medium">2</span>
          <span className="flex items-center gap-1">
            Appuyez sur <Share className="w-4 h-4 text-blue-500" /> <strong>Partager</strong> (en bas)
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 font-medium">3</span>
          <span className="flex items-center gap-1">
            Selectionnez <Plus className="w-4 h-4 text-blue-500" /> <strong>Sur l'ecran d'accueil</strong>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 font-medium">4</span>
          <span>Appuyez sur <strong>Ajouter</strong> en haut a droite</span>
        </li>
      </ol>
      <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href="/employee">
            <ExternalLink className="w-4 h-4 mr-2" />
            Ouvrir /employee dans Safari
          </a>
        </Button>
      </div>
    </div>
  );

  const InstallInstructionsAndroid = () => (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Smartphone className="w-4 h-4" />
        Installation sur Android
      </h4>
      {isInstallable ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            L'installation est prete ! Cliquez sur le bouton ci-dessous.
          </p>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleInstallPWA}
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            Installer l'application
          </Button>
        </div>
      ) : (
        <ol className="text-sm text-muted-foreground space-y-3">
          <li className="flex items-start gap-2">
            <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 font-medium">1</span>
            <span>Ouvrez cette page dans <strong>Chrome</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 font-medium">2</span>
            <span className="flex items-center gap-1">
              Appuyez sur <MoreVertical className="w-4 h-4 text-green-500" /> (menu 3 points)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 font-medium">3</span>
            <span>Selectionnez <strong>Installer l'application</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 font-medium">4</span>
            <span>Confirmez en appuyant sur <strong>Installer</strong></span>
          </li>
        </ol>
      )}
      <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-700">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href="/employee">
            <ExternalLink className="w-4 h-4 mr-2" />
            Ouvrir l'app terrain
          </a>
        </Button>
      </div>
    </div>
  );

  const InstalledMessage = () => (
    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-semibold">Application installee !</span>
      </div>
      <p className="text-sm text-green-600 dark:text-green-400">
        Provia BASE Terrain est deja installe sur cet appareil. Recherchez l'icone sur votre ecran d'accueil.
      </p>
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
    sublabel,
    variant = "default",
    disabled = false
  }: {
    href: string | null;
    icon: any;
    label: string;
    sublabel?: string;
    variant?: "default" | "outline";
    disabled?: boolean;
  }) => {
    if (!href || disabled) {
      return (
        <Button
          className="w-full h-14 text-base flex flex-col items-center justify-center"
          variant={variant}
          disabled
        >
          <span className="flex items-center">
            <Icon className="w-5 h-5 mr-2" />
            {label}
          </span>
          {sublabel && <span className="text-xs opacity-70">{sublabel}</span>}
        </Button>
      );
    }

    return (
      <Button
        className="w-full h-14 text-base flex flex-col items-center justify-center"
        variant={variant}
        asChild
      >
        <a href={href}>
          <span className="flex items-center">
            <Icon className="w-5 h-5 mr-2" />
            {label}
          </span>
          {sublabel && <span className="text-xs opacity-70">{sublabel}</span>}
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
                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium">
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
                    Erreur lors du chargement. Reessayez plus tard.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    <DownloadButton
                      href={downloadLinks.windows}
                      icon={DownloadIcon}
                      label="Telecharger pour Windows"
                      sublabel=".exe - Windows 10+"
                      disabled={!downloadLinks.windows}
                    />
                    <DownloadButton
                      href={downloadLinks.macos}
                      icon={Apple}
                      label="Telecharger pour macOS"
                      sublabel=".dmg - macOS 10.13+"
                      variant="outline"
                      disabled={!downloadLinks.macos}
                    />
                  </div>
                  {(!downloadLinks.windows && !downloadLinks.macos) && (
                    <NoReleaseMessage />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Mobile App Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Provia BASE - Terrain</CardTitle>
              <CardDescription>
                Application mobile pour les techniciens
              </CardDescription>
              <span className="inline-block mt-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full font-medium">
                PWA - Progressive Web App
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstalled ? (
                <InstalledMessage />
              ) : deviceType === "desktop" ? (
                <>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-4">
                      Scannez ce QR code avec votre telephone pour installer l'app terrain.
                    </p>
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-xl shadow-lg">
                        <QRCode url={employeeAppUrl} size={140} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      <strong className="font-mono text-primary">{employeeAppUrl}</strong>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-center">
                      <strong className="text-blue-700 dark:text-blue-300">iOS</strong>
                      <p>Safari → Partager → Ecran d'accueil</p>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-center">
                      <strong className="text-green-700 dark:text-green-300">Android</strong>
                      <p>Chrome → Menu → Installer</p>
                    </div>
                  </div>
                </>
              ) : deviceType === "ios" ? (
                <InstallInstructionsiOS />
              ) : (
                <InstallInstructionsAndroid />
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
