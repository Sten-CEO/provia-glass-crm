import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FilesSectionProps {
  interventionId: string | undefined;
}

export function FilesSection({ interventionId }: FilesSectionProps) {
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    if (interventionId) {
      loadFiles();
    }
  }, [interventionId]);

  const loadFiles = async () => {
    if (!interventionId) return;
    const { data } = await supabase
      .from("intervention_files")
      .select("*")
      .eq("intervention_id", interventionId)
      .order("created_at", { ascending: false });
    if (data) setFiles(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!interventionId) {
      toast.error("Veuillez d'abord enregistrer l'intervention");
      return;
    }

    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Pour simplifier, on enregistre juste les métadonnées
      // Dans un vrai système, on uploadrait vers Supabase Storage
      const { data, error } = await supabase
        .from("intervention_files")
        .insert([{
          intervention_id: interventionId,
          file_name: file.name,
          file_url: URL.createObjectURL(file), // Temporaire
          file_type: file.type,
          file_size: file.size,
          category: file.type.startsWith("image/") ? "photo" : "document",
        }])
        .select()
        .single();

      if (error) {
        toast.error(`Erreur pour ${file.name}`);
      } else {
        toast.success(`${file.name} ajouté`);
      }
    }

    loadFiles();
  };

  const deleteFile = async (fileId: string) => {
    const { error } = await supabase
      .from("intervention_files")
      .delete()
      .eq("id", fileId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    setFiles(files.filter(f => f.id !== fileId));
    toast.success("Fichier supprimé");
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fichiers & Photos</CardTitle>
          <label htmlFor="file-upload">
            <Button type="button" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Ajouter des fichiers
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun fichier ajouté. Cliquez sur "Ajouter des fichiers" pour uploader.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <div key={file.id} className="relative border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center gap-2">
                  {file.file_type?.startsWith("image/") ? (
                    <Image className="h-12 w-12 text-primary" />
                  ) : (
                    <FileText className="h-12 w-12 text-primary" />
                  )}
                  <p className="text-sm font-medium text-center line-clamp-2">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => deleteFile(file.id)}
                    className="w-full mt-2"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
