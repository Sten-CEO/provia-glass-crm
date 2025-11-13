import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, Trash2, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
            {files.map((file) => {
              const isImage = file.file_type?.startsWith("image/") || file.category === "photo";
              const photoTypeLabel = file.photo_type === "before" ? "Photo avant" : 
                                     file.photo_type === "after" ? "Photo après" : null;
              
              return (
                <div key={file.id} className="relative border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex flex-col">
                    {/* Image preview or icon */}
                    <div className="relative w-full h-48 bg-muted flex items-center justify-center">
                      {isImage ? (
                        <>
                          <img 
                            src={file.file_url} 
                            alt={file.file_name}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => window.open(file.file_url, '_blank')}
                          />
                          {photoTypeLabel && (
                            <Badge 
                              className="absolute top-2 left-2 bg-primary text-primary-foreground"
                            >
                              {photoTypeLabel}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <FileText className="h-12 w-12 text-primary" />
                      )}
                    </div>
                    
                    {/* File info and actions */}
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-medium text-center line-clamp-2">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground text-center">
                        {(file.file_size / 1024).toFixed(1)} KB
                      </p>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={async () => {
                            try {
                              const response = await fetch(file.file_url);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = file.file_name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                              toast.success("Téléchargement démarré");
                            } catch (error) {
                              toast.error("Erreur lors du téléchargement");
                            }
                          }}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Télécharger
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => deleteFile(file.id)}
                          className="flex-1"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
