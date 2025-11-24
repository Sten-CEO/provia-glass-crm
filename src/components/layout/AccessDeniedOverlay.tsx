import { Lock } from "lucide-react";

export const AccessDeniedOverlay = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background */}
      <div className="absolute inset-0 backdrop-blur-md bg-background/80" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-lg glass-card max-w-md mx-4">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="w-10 h-10 text-destructive" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Accès refusé</h2>
          <p className="text-muted-foreground">
            Vous n'avez pas accès à cette page. Veuillez contacter votre administrateur si vous pensez qu'il s'agit d'une erreur.
          </p>
        </div>
      </div>
    </div>
  );
};
