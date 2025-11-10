import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface AddressFieldsProps {
  address: Address;
  onChange: (address: Address) => void;
  label: string;
  disabled?: boolean;
}

export function AddressFields({
  address,
  onChange,
  label,
  disabled,
}: AddressFieldsProps) {
  return (
    <div className="space-y-3">
      <Label className="font-semibold">{label}</Label>
      
      <div>
        <Label htmlFor={`${label}-street`} className="text-sm">Adresse</Label>
        <Textarea
          id={`${label}-street`}
          value={address.street || ""}
          onChange={(e) => onChange({ ...address, street: e.target.value })}
          placeholder="Rue, numéro..."
          rows={2}
          disabled={disabled}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${label}-postal`} className="text-sm">Code postal</Label>
          <Input
            id={`${label}-postal`}
            value={address.postalCode || ""}
            onChange={(e) => onChange({ ...address, postalCode: e.target.value })}
            placeholder="Code postal"
            disabled={disabled}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`${label}-city`} className="text-sm">Ville</Label>
          <Input
            id={`${label}-city`}
            value={address.city || ""}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            placeholder="Ville"
            disabled={disabled}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`${label}-country`} className="text-sm">Pays</Label>
        <Input
          id={`${label}-country`}
          value={address.country || "France"}
          onChange={(e) => onChange({ ...address, country: e.target.value })}
          placeholder="Pays"
          disabled={disabled}
          className="mt-1"
        />
      </div>
    </div>
  );
}
