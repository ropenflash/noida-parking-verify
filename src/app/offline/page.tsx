import { AppLogo } from "@/components/app-logo";

export default function OfflinePage() {
  return (
    <div className="space-y-3">
      <AppLogo size={48} />
      <h1 className="text-xl font-semibold">You are offline</h1>
      <p className="text-sm text-zinc-700">
        You can still fill a verification draft on this device. It is not submitted to
        the server until a connection returns.
      </p>
    </div>
  );
}
