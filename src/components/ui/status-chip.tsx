import { cn } from "@/lib/utils";

type StatusChipVariant = "green" | "blue" | "amber" | "gray" | "red";

interface StatusChipProps {
  variant: StatusChipVariant;
  children: React.ReactNode;
  className?: string;
}

const variantColors: Record<StatusChipVariant, string> = {
  green: "text-[#22C55E] border-[#22C55E]/30 bg-[rgba(34,197,94,0.08)]",
  blue: "text-[#3B82F6] border-[#3B82F6]/30 bg-[rgba(59,130,246,0.08)]",
  amber: "text-[#F59E0B] border-[#F59E0B]/30 bg-[rgba(245,158,11,0.08)]",
  gray: "text-[#6B7280] border-[#6B7280]/30 bg-[rgba(107,114,128,0.08)]",
  red: "text-[#EF4444] border-[#EF4444]/30 bg-[rgba(239,68,68,0.08)]",
};

export function StatusChip({ variant, children, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-[13px] font-medium tracking-[.01em]",
        "backdrop-blur-[8px] border transition-all shadow-[0_2px_8px_rgba(0,0,0,.06)]",
        "hover:translate-y-[0.5px] hover:border-current/45",
        variantColors[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
