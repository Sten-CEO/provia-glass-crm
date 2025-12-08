import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eraser, Pen, Type } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
}

export function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configuration du canvas
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Gérer le changement de mode
  useEffect(() => {
    if (signatureMode === "draw" && hasDrawn) {
      const canvas = canvasRef.current;
      if (canvas) {
        onSignatureChange(canvas.toDataURL("image/png"));
      }
    } else if (signatureMode === "type" && typedSignature.trim()) {
      // Générer une image à partir du texte
      generateTextSignature(typedSignature);
    } else {
      onSignatureChange(null);
    }
  }, [signatureMode, typedSignature, hasDrawn]);

  const generateTextSignature = (text: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fond blanc
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Texte en cursive
    ctx.fillStyle = "#000";
    ctx.font = "italic 48px 'Brush Script MT', cursive, 'Arial'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    onSignatureChange(canvas.toDataURL("image/png"));
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e
      ? e.touches[0].clientX - rect.left
      : e.clientX - rect.left;
    const y = "touches" in e
      ? e.touches[0].clientY - rect.top
      : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e
      ? e.touches[0].clientX - rect.left
      : e.clientX - rect.left;
    const y = "touches" in e
      ? e.touches[0].clientY - rect.top
      : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        onSignatureChange(canvas.toDataURL("image/png"));
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-4">
      <Tabs value={signatureMode} onValueChange={(v) => setSignatureMode(v as "draw" | "type")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw" className="flex items-center gap-2">
            <Pen className="h-4 w-4" />
            Dessiner
          </TabsTrigger>
          <TabsTrigger value="type" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Taper
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-3">
          <div>
            <Label>Dessinez votre signature ci-dessous</Label>
            <div className="mt-2 border-2 border-dashed border-slate-300 rounded-lg p-2 bg-white">
              <canvas
                ref={canvasRef}
                width={400}
                height={120}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={clearCanvas}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Eraser className="h-4 w-4 mr-2" />
            Effacer la signature
          </Button>
        </TabsContent>

        <TabsContent value="type" className="space-y-3">
          <div>
            <Label htmlFor="typed-signature">Tapez votre nom complet</Label>
            <Input
              id="typed-signature"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Jean Dupont"
              className="mt-2 text-xl italic"
            />
          </div>
          {typedSignature.trim() && (
            <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg bg-white text-center">
              <div className="text-5xl italic font-serif">{typedSignature}</div>
              <p className="text-xs text-slate-500 mt-2">Aperçu de votre signature</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
