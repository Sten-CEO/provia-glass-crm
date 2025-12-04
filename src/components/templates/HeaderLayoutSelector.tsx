import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface HeaderLayout {
  key: string;
  label: string;
  description: string;
  preview: React.ReactNode;
}

interface HeaderLayoutSelectorProps {
  value: string;
  onChange: (layout: string) => void;
}

export function HeaderLayoutSelector({ value, onChange }: HeaderLayoutSelectorProps) {
  const layouts: HeaderLayout[] = [
    {
      key: "logo-left",
      label: "Logo à gauche",
      description: "Logo aligné à gauche, titre à droite",
      preview: (
        <div className="w-full h-16 border rounded flex items-center justify-between p-3 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xs font-medium">Logo</div>
          </div>
          <div className="text-xs font-semibold">DEVIS</div>
        </div>
      ),
    },
    {
      key: "logo-center",
      label: "Logo centré",
      description: "Logo et titre centrés",
      preview: (
        <div className="w-full h-16 border rounded flex flex-col items-center justify-center p-3 bg-white">
          <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center mb-1">
            <ImageIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xs font-semibold">DEVIS</div>
        </div>
      ),
    },
    {
      key: "logo-right",
      label: "Logo à droite",
      description: "Titre à gauche, logo à droite",
      preview: (
        <div className="w-full h-16 border rounded flex items-center justify-between p-3 bg-white">
          <div className="text-xs font-semibold">DEVIS</div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium">Logo</div>
            <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "split",
      label: "Réparti",
      description: "Logo et infos en colonnes",
      preview: (
        <div className="w-full h-16 border rounded grid grid-cols-2 gap-2 p-3 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex flex-col justify-center text-right">
            <div className="text-xs font-semibold">DEVIS</div>
            <div className="text-[10px] text-muted-foreground">N° 2025-001</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Disposition de l'en-tête</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Choisissez comment organiser le logo et le titre
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {layouts.map((layout) => (
          <button
            key={layout.key}
            type="button"
            onClick={() => onChange(layout.key)}
            className={cn(
              "p-3 rounded-lg border-2 transition-all hover:border-primary/50",
              value === layout.key
                ? "border-primary bg-primary/5"
                : "border-border bg-background"
            )}
          >
            <div className="space-y-2">
              {layout.preview}
              <div className="text-left">
                <div className="text-sm font-medium">{layout.label}</div>
                <div className="text-xs text-muted-foreground">
                  {layout.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
