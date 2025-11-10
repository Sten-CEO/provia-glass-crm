import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface AttachmentsPanelProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  disabled?: boolean;
}

export function AttachmentsPanel({
  attachments,
  onChange,
  disabled,
}: AttachmentsPanelProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // TODO: Implement actual file upload to Supabase Storage
      const newAttachments: Attachment[] = Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        url: URL.createObjectURL(file), // Temporary URL
        type: file.type,
        size: file.size,
      }));

      onChange([...attachments, ...newAttachments]);
      toast.success(`${files.length} fichier(s) ajouté(s)`);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-3">
      <Label>Pièces jointes</Label>
      
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
          >
            <div className="flex items-center gap-3">
              {attachment.type.startsWith("image/") ? (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <div className="text-sm font-medium">{attachment.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeAttachment(attachment.id)}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <input
          type="file"
          id="file-upload"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />
        <Label htmlFor="file-upload">
          <Button
            variant="outline"
            className="w-full"
            disabled={disabled || uploading}
            asChild
          >
            <span>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Upload en cours..." : "Ajouter des fichiers"}
            </span>
          </Button>
        </Label>
      </div>
    </div>
  );
}
