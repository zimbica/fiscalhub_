import { ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-md bg-primary text-white ",
          inverse && "bg-white/10 ring-1 ring-white/20",
        )}
      >
        <ScanLine className="size-4" strokeWidth={2.2} />
      </span>
      <span
        className={cn(
          "text-base font-semibold tracking-tight",
          inverse && "text-white",
        )}
      >
        Fiscal
        <span className={inverse ? "text-white" : "text-foreground"}>Hub</span>
      </span>
    </span>
  );
}
