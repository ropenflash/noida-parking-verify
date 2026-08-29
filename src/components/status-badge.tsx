import { CLASSIFICATION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  VERIFIED_LEGAL: "bg-emerald-700 text-white",
  LIKELY_LEGAL: "bg-emerald-100 text-emerald-900 border border-emerald-300",
  NEEDS_VERIFICATION: "bg-amber-100 text-amber-950 border border-amber-300",
  POTENTIALLY_UNAUTHORISED: "bg-red-100 text-red-900 border border-red-300",
  OVERCHARGING: "bg-orange-700 text-white",
  UNKNOWN: "bg-zinc-200 text-zinc-800",
};

export function StatusBadge({
  classification,
  large = false,
}: {
  classification: string | null | undefined;
  large?: boolean;
}) {
  if (!classification) {
    return (
      <span className="inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
        Draft
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-semibold tracking-wide uppercase",
        large ? "px-3 py-2 text-sm sm:text-base" : "px-2 py-0.5 text-xs",
        styles[classification] ?? "bg-zinc-200 text-zinc-800",
      )}
    >
      {CLASSIFICATION_LABELS[classification] ?? classification}
    </span>
  );
}

const sectionStyles: Record<string, string> = {
  VERIFIED: "border-emerald-300 bg-emerald-50",
  UNCERTAIN: "border-amber-300 bg-amber-50",
  CONFLICTING: "border-red-300 bg-red-50",
  UNAVAILABLE: "border-zinc-200 bg-zinc-50",
};

const sectionDot: Record<string, string> = {
  VERIFIED: "bg-emerald-600",
  UNCERTAIN: "bg-amber-500",
  CONFLICTING: "bg-red-600",
  UNAVAILABLE: "bg-zinc-400",
};

export function SectionCard({
  title,
  status,
  children,
}: {
  title: string;
  status?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border p-4",
        sectionStyles[status ?? "UNAVAILABLE"],
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "inline-block size-2.5 rounded-full",
            sectionDot[status ?? "UNAVAILABLE"],
          )}
        />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="text-sm text-zinc-700">{children}</div>
    </section>
  );
}
