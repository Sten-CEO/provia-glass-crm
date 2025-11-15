import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Contract {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  notes: string | null;
}

interface ContractUploadSectionProps {
  clientId: string;
}

export const ContractUploadSection = ({ clientId }: ContractUploadSectionProps) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadContracts();

    const channel = supabase
      .channel('client-contracts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_contracts',
        filter: `client_id=eq.${clientId}`
      }, () => {
        loadContracts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const loadContracts = async () => {
    const { data } = await supabase
      .from('client_contracts')
      .select('*')
      .eq('client_id', clientId)
      .order('uploaded_at', { ascending: false });

    if (data) {
      setContracts(data);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${clientId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-contracts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-contracts')
        .getPublicUrl(filePath);

      // Récupérer les infos du client
      const { data: clientData } = await supabase
        .from('clients')
        .select('nom')
        .eq('id', clientId)
        .single();

      // Générer un numéro de contrat unique
      const contractNumber = `CONT-${Date.now()}`;

      // Insérer dans client_contracts (pour la fiche client)
      const { error: dbError1 } = await supabase
        .from('client_contracts')
        .insert({
          client_id: clientId,
          file_name: file.name,
          file_url: publicUrl,
        });

      if (dbError1) throw dbError1;

      // Insérer AUSSI dans contracts (pour la page globale)
      const { error: dbError2 } = await supabase
        .from('contracts')
        .insert({
          client_id: clientId,
          contract_number: contractNumber,
          title: file.name.replace(/\.[^/.]+$/, ''), // nom sans extension
          status: 'active',
          notes: 'Contrat téléchargé depuis la fiche client'
        });

      if (dbError2) throw dbError2;

      toast.success('Contrat ajouté avec succès');
      loadContracts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (contract: Contract) => {
    if (!confirm('Supprimer ce contrat ?')) return;

    try {
      const { error } = await supabase
        .from('client_contracts')
        .delete()
        .eq('id', contract.id);

      if (error) throw error;

      toast.success('Contrat supprimé');
      loadContracts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Contrats</h3>
        <Button onClick={() => document.getElementById('contract-upload')?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Upload...' : 'Ajouter un contrat'}
        </Button>
        <input
          id="contract-upload"
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      <div className="space-y-2">
        {contracts.length === 0 ? (
          <Card className="p-4 text-center text-muted-foreground">
            Aucun contrat
          </Card>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{contract.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(contract.uploaded_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(contract.file_url, '_blank')}>
                  Ouvrir
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(contract)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
