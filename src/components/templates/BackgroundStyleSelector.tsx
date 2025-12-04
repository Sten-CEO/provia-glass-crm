import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BackgroundStyle {
  key: string;
  label: string;
  description: string;
  preview: React.ReactNode;
}

interface BackgroundStyleSelectorProps {
  value: string;
  onChange: (style: string) => void;
  mainColor?: string;
  accentColor?: string;
}

export function BackgroundStyleSelector({
  value,
  onChange,
  mainColor = "#3b82f6",
  accentColor = "#fbbf24",
}: BackgroundStyleSelectorProps) {
  const styles: BackgroundStyle[] = [
    {
      key: "solid",
      label: "Uni",
      description: "Fond blanc uni",
      preview: (
        <div className="w-full h-20 bg-white border rounded" />
      ),
    },
    {
      key: "gradient",
      label: "Dégradé",
      description: "Dégradé subtil",
      preview: (
        <div
          className="w-full h-20 rounded border"
          style={{
            background: `linear-gradient(135deg, ${mainColor}10 0%, ${accentColor}10 100%)`,
          }}
        />
      ),
    },
    {
      key: "pattern",
      label: "Motif",
      description: "Motif géométrique léger",
      preview: (
        <div
          className="w-full h-20 rounded border"
          style={{
            backgroundColor: "#f9fafb",
            backgroundImage: `repeating-linear-gradient(45deg, ${mainColor}05 0px, ${mainColor}05 10px, transparent 10px, transparent 20px)`,
          }}
        />
      ),
    },
    {
      key: "none",
      label: "Aucun",
      description: "Pas d'arrière-plan",
      preview: (
        <div className="w-full h-20 border-2 border-dashed rounded bg-transparent" />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Style d'arrière-plan</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Choisissez le style d'arrière-plan du document
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {styles.map((style) => (
          <button
            key={style.key}
            type="button"
            onClick={() => onChange(style.key)}
            className={cn(
              "p-3 rounded-lg border-2 transition-all hover:border-primary/50",
              value === style.key
                ? "border-primary bg-primary/5"
                : "border-border bg-background"
            )}
          >
            <div className="space-y-2">
              {style.preview}
              <div className="text-left">
                <div className="text-sm font-medium">{style.label}</div>
                <div className="text-xs text-muted-foreground">
                  {style.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
