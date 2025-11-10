import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface NotesSignatureSectionProps {
  intervention: any;
  onChange: (intervention: any) => void;
}

export function NotesSignatureSection({ intervention, onChange }: NotesSignatureSectionProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...intervention, [field]: value });
  };

  return (
    <div className="grid gap-6">
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Notes internes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            value={intervention.internal_notes || ""} 
            onChange={(e) => updateField("internal_notes", e.target.value)}
            placeholder="Notes visibles uniquement par l'équipe..."
            rows={4}
          />
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Notes client</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            value={intervention.client_notes || ""} 
            onChange={(e) => updateField("client_notes", e.target.value)}
            placeholder="Notes qui apparaîtront sur le PDF..."
            rows={4}
          />
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Signature client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du signataire</Label>
            <Input 
              value={intervention.signature_name || ""} 
              onChange={(e) => updateField("signature_name", e.target.value)}
              placeholder="Nom et prénom"
            />
          </div>

          <div className="space-y-2">
            <Label>Date de signature</Label>
            <Input 
              type="datetime-local"
              value={intervention.signature_date ? new Date(intervention.signature_date).toISOString().slice(0, 16) : ""} 
              onChange={(e) => updateField("signature_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>

          <div className="space-y-2">
            <Label>Signature (Image)</Label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              {intervention.signature_image ? (
                <div className="space-y-2">
                  <img src={intervention.signature_image} alt="Signature" className="max-h-32 mx-auto" />
                  <button 
                    onClick={() => updateField("signature_image", null)}
                    className="text-sm text-destructive hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Signature pad à implémenter
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
