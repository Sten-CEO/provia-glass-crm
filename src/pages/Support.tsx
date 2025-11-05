import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Phone, CheckCircle } from "lucide-react";

const Support = () => {
  const [formData, setFormData] = useState({ nom: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message envoyé avec succès!");
    setFormData({ nom: "", email: "", message: "" });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-3xl font-bold uppercase tracking-wide">Support</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold uppercase tracking-wide mb-4">
            Contacter le support
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="glass-card"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-card"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="glass-card min-h-[120px]"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
              Envoyer
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Phone className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold uppercase tracking-wide">
                Onboarding assisté
              </h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Besoin d'aide pour configurer votre CRM? Appelez un conseiller pour 30 minutes d'assistance personnalisée.
            </p>
            <Button variant="outline" className="w-full">
              Appeler un conseiller
            </Button>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-secondary" />
              <h2 className="text-xl font-bold uppercase tracking-wide">
                Checklist d'import
              </h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Importer vos clients
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Configurer vos modèles
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                Inviter votre équipe
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
