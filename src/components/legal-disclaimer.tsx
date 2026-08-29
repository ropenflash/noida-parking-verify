import { LEGAL_DISCLAIMER } from "@/lib/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LegalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <Alert className="border-zinc-200 bg-zinc-50">
      <AlertDescription className={compact ? "text-xs" : "text-sm"}>
        {LEGAL_DISCLAIMER} Wording such as “evidence suggests”, “could not
        verify”, and “potentially unauthorised” is used on purpose. This app
        does not accuse a person of a crime.
      </AlertDescription>
    </Alert>
  );
}
