import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eraser, Check } from "lucide-react";

interface SignatureCanvasProps {
  jobId: string;
  employeeId: string;
  onSignatureSaved: () => void;
}

export const SignatureCanvas = ({
  jobId,
  employeeId,
  onSignatureSaved,
}: SignatureCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    if (!signerName.trim()) {
      toast.error("Veuillez saisir le nom du signataire");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setSaving(true);

      // Convertir le canvas en blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      // Upload vers Supabase Storage
      const fileName = `${jobId}/${employeeId}/signature-${Date.now()}.png`;
      const filePath = `job-signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("job-signatures")
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from("job-signatures")
        .getPublicUrl(filePath);

      // Enregistrer dans job_signatures
      const { error: dbError } = await supabase
        .from("job_signatures")
        .insert({
          job_id: jobId,
          employee_id: employeeId,
          signer_name: signerName,
          signer_email: signerEmail || null,
          image_url: urlData.publicUrl,
        });

      if (dbError) throw dbError;

      toast.success("Signature enregistrée avec succès");
      onSignatureSaved();
      clearCanvas();
      setSignerName("");
      setSignerEmail("");
    } catch (error: any) {
      console.error("Signature save error:", error);
      toast.error("Erreur lors de l'enregistrement de la signature");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Nom du signataire *</Label>
        <Input
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Nom complet du client"
        />
      </div>

      <div className="space-y-2">
        <Label>Email (optionnel)</Label>
        <Input
          type="email"
          value={signerEmail}
          onChange={(e) => setSignerEmail(e.target.value)}
          placeholder="email@exemple.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Signature</Label>
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="border border-border rounded-lg touch-none w-full bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: "none" }}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={clearCanvas}
        >
          <Eraser className="mr-2 h-4 w-4" />
          Effacer
        </Button>
        <Button
          className="flex-1"
          onClick={saveSignature}
          disabled={saving}
        >
          <Check className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement..." : "Valider"}
        </Button>
      </div>
    </Card>
  );
};
