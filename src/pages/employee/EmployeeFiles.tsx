import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileImage, Calendar, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface File {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
  category: string;
  intervention_id: string;
  metadata: any;
  jobs?: {
    titre: string;
    client_nom: string;
  };
}

export const EmployeeFiles = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: employee } = await supabase
        .from("equipe")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!employee) return;

      // Charger tous les fichiers de l'employé
      const { data, error } = await supabase
        .from("intervention_files")
        .select(`
          *,
          jobs (titre, client_nom)
        `)
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);

    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement des fichiers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Supprimer ce fichier ?")) return;

    try {
      const { error } = await supabase
        .from("intervention_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;
      
      toast.success("Fichier supprimé");
      setFiles(files.filter((f) => f.id !== fileId));
    } catch (error) {
      console.error(error);
      toast.error("Erreur de suppression");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      photo: "bg-blue-100 text-blue-800",
      avant: "bg-green-100 text-green-800",
      apres: "bg-purple-100 text-purple-800",
      signature: "bg-orange-100 text-orange-800",
      general: "bg-gray-100 text-gray-800"
    };

    return colors[category] || colors.general;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  const todayFiles = files.filter((f) => {
    const fileDate = new Date(f.created_at);
    const today = new Date();
    return fileDate.toDateString() === today.toDateString();
  });

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes fichiers</h1>
        <p className="text-muted-foreground">
          Photos et documents de vos interventions
        </p>
      </div>

      {/* Fichiers du jour */}
      {todayFiles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Aujourd'hui
            <Badge variant="secondary">{todayFiles.length}</Badge>
          </h2>
          <div className="space-y-3">
            {todayFiles.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {file.file_type?.startsWith("image/") ? (
                      <img 
                        src={file.file_url} 
                        alt={file.file_name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium truncate">{file.file_name}</h3>
                      <Badge className={getCategoryBadge(file.category)}>
                        {file.category}
                      </Badge>
                    </div>

                    {file.jobs && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {file.jobs.titre} · {file.jobs.client_nom}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.file_size || 0)}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(file.created_at), "HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(file.file_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Fichiers plus anciens */}
      {files.length > todayFiles.length && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Fichiers précédents
            <Badge variant="secondary" className="ml-2">
              {files.length - todayFiles.length}
            </Badge>
          </h2>
          <div className="space-y-3">
            {files.filter((f) => !todayFiles.includes(f)).map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {file.file_type?.startsWith("image/") ? (
                      <img 
                        src={file.file_url} 
                        alt={file.file_name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium truncate">{file.file_name}</h3>
                      <Badge className={getCategoryBadge(file.category)}>
                        {file.category}
                      </Badge>
                    </div>

                    {file.jobs && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {file.jobs.titre} · {file.jobs.client_nom}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.file_size || 0)}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(file.created_at), "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(file.file_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Aucun fichier pour le moment
        </Card>
      )}
    </div>
  );
};
