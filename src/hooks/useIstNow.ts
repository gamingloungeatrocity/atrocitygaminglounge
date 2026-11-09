import { useEffect, useState } from "react";
import { getIstNow, type IstNow } from "@/lib/time";

/** Current India Standard Time, refreshed periodically (default every 30s). */
export function useIstNow(intervalMs = 30_000): IstNow {
  const [now, setNow] = useState<IstNow>(() => getIstNow());

  useEffect(() => {
    const id = window.setInterval(() => setNow(getIstNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
