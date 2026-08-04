import { useEffect, useState } from "react";
import { fetchHealthz } from "@/api";

/**
 * Free Render services sleep after idle time. While they wake (30–90s),
 * show a clear banner instead of a blank/broken UI.
 */
export default function ServerWakeBanner() {
  const [state, setState] = useState("checking"); // checking | waking | ready | error
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let timer;

    async function probe() {
      attempt += 1;
      try {
        await fetchHealthz({ timeoutMs: attempt === 1 ? 8000 : 45000 });
        if (!cancelled) setState("ready");
        return;
      } catch {
        if (cancelled) return;
        setState("waking");
        // Retry for up to ~3 minutes (Render cold start)
        if (attempt < 12) {
          timer = setTimeout(probe, 5000);
        } else {
          setState("error");
        }
      }
    }

    probe();
    const tick = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, []);

  if (state === "ready" || state === "checking") return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] border-b border-amber-500/40 bg-amber-950/95 px-4 py-2.5 text-center text-sm text-amber-50 shadow-lg backdrop-blur"
    >
      {state === "waking" ? (
        <p>
          Server is waking up (free hosting). This can take up to a minute
          {seconds > 0 ? ` · ${seconds}s` : ""}. Keep this tab open…
        </p>
      ) : (
        <p>
          Cannot reach the API. Open{" "}
          <a
            className="underline decoration-amber-300/80 hover:text-white"
            href="https://perspective-lab.onrender.com/api/health"
            target="_blank"
            rel="noreferrer"
          >
            health check
          </a>{" "}
          once to wake it, then refresh this page.
        </p>
      )}
    </div>
  );
}
