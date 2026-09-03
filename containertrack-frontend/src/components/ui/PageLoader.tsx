import { Spinner } from "../shared/Spinner";

/** Centered full-page loading fallback used while route-level chunks are being fetched. */
export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-ivory">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
