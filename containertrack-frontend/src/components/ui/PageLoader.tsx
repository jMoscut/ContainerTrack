import { Spinner } from "../shared/Spinner";

/** Centered full-page loading fallback used while route-level chunks are being fetched. */
export function PageLoader() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-ivory">
      <span className="animate-brand-pulse font-display text-xl font-bold tracking-tight text-primary">
        ContainerTrack
      </span>
      <Spinner className="h-7 w-7" />
    </div>
  );
}
