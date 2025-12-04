import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { replaceVariables, getSampleValues } from "@/lib/templateVariables";

interface LiveEmailPreviewProps {
  subject: string;
  body: string;
  emailType?: "quote" | "invoice" | "reminder";
}

export function LiveEmailPreview({
  subject,
  body,
  emailType = "quote",
}: LiveEmailPreviewProps) {
  // Get sample values for preview
  const sampleValues = getSampleValues(emailType);

  // Replace variables in subject and body
  const previewSubject = replaceVariables(subject || "Sujet de l'email", sampleValues);
  const previewBody = replaceVariables(
    body || "Contenu de l'email...",
    sampleValues
  );

  return (
    <Card className="overflow-hidden">
      {/* Email header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">
              {sampleValues.NomEntreprise}
            </div>
            <div className="text-xs text-muted-foreground">
              {sampleValues.EmailEntreprise}
            </div>
          </div>
        </div>
      </div>

      {/* Email metadata */}
      <div className="bg-muted/30 border-b px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium">À :</span>
          <span className="text-foreground">
            {sampleValues.NomClient} &lt;{sampleValues.EmailClient}&gt;
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Objet :</span>
          <span className="text-foreground font-semibold">{previewSubject}</span>
        </div>
      </div>

      {/* Email body */}
      <div className="p-6 bg-white">
        <div className="prose prose-sm max-w-none">
          <div
            className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
            dangerouslySetInnerHTML={{
              __html: previewBody.replace(/\n/g, "<br />"),
            }}
          />
        </div>
      </div>

      {/* Email footer */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t px-6 py-4">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-medium">{sampleValues.NomEntreprise}</div>
          <div>{sampleValues.AdresseEntreprise}</div>
          <div>
            Tél : {sampleValues.TelephoneEntreprise} | Email :{" "}
            {sampleValues.EmailEntreprise}
          </div>
          {sampleValues.SIRETEntreprise && (
            <div>SIRET : {sampleValues.SIRETEntreprise}</div>
          )}
        </div>
      </div>

      {/* Preview indicator */}
      <div className="bg-amber-50 border-t border-amber-200 px-4 py-2">
        <p className="text-xs text-amber-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Aperçu avec données d'exemple
        </p>
      </div>
    </Card>
  );
}
