import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SubFunction {
  label: string;
  path: string;
}

interface SubFunctionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subFunctions: SubFunction[];
}

export function SubFunctionsDrawer({ open, onOpenChange, title, subFunctions }: SubFunctionsDrawerProps) {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="glass-modal">
        <SheetHeader>
          <SheetTitle className="uppercase tracking-wide">Sous-fonctions · {title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {subFunctions.map((fn) => (
            <Button
              key={fn.path}
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                navigate(fn.path);
                onOpenChange(false);
              }}
            >
              {fn.label}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
