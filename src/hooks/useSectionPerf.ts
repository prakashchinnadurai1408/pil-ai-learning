import { useEffect } from "react";
import { installFetchTimer, popApiBucket, pushApiBucket, recordSample } from "@/lib/perfMetrics";

/**
 * Measures how long the calling section takes to mount + how many ms its
 * fetch/xhr calls consume on average. Call once at the top of a section
 * component:
 *
 *   useSectionPerf("ai_path");
 */
export function useSectionPerf(section: string) {
  useEffect(() => {
    installFetchTimer();
    pushApiBucket();
    const start = performance.now();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const renderMs = performance.now() - start;
        const { avg, count } = popApiBucket();
        recordSample({
          section,
          renderMs,
          apiMs: avg,
          apiCount: count,
          ts: Date.now(),
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
