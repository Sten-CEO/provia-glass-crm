import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEmployee } from "@/contexts/EmployeeContext";

interface JobPhotoCaptureProps {
  jobId: string;
  employeeId: string;
  photoType: "before" | "after" | "other";
  onPhotoUploaded: () => void;
}

export const JobPhotoCapture = ({
  jobId,
  employeeId,
  photoType,
  onPhotoUploaded,
}: JobPhotoCaptureProps) => {
  const { companyId } = useEmployee();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Afficher un aperçu
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    await uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    try {
      setUploading(true);

      // Upload vers Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${jobId}/${employeeId}/${Date.now()}.${fileExt}`;
      const filePath = `intervention-photos/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("intervention-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from("intervention-photos")
        .getPublicUrl(filePath);

      // Enregistrer dans intervention_files
      const { error: dbError } = await supabase
        .from("intervention_files")
        .insert({
          intervention_id: jobId,
          employee_id: employeeId,
          company_id: companyId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: "image",
          file_size: file.size,
          photo_type: photoType,
          category: "photo",
        });

      if (dbError) throw dbError;

      toast.success("Photo ajoutée avec succès");
      onPhotoUploaded();
      setPreview(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'ajout de la photo");
    } finally {
      setUploading(false);
    }
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    galleryInputRef.current?.click();
  };

  return (
    <Card className="p-4">
      {/* Input pour la caméra */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Input pour la galerie */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Aperçu"
            className="w-full h-48 object-cover rounded-lg"
          />
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2"
            onClick={() => setPreview(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={triggerCamera}
            disabled={uploading}
          >
            <Camera className="mr-2 h-4 w-4" />
            {uploading ? "Envoi en cours..." : "Prendre une photo"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={triggerGallery}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choisir depuis la galerie
          </Button>
        </div>
      )}
    </Card>
  );
};
