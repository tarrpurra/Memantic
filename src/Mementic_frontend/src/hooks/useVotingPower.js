import { useCallback, useEffect, useMemo, useState } from "react";
import backendService from "../services/backendService";

/**
 * Manages weekly voting power for the authenticated user.
 * - Default weekly power: 100
 * - Cost per vote: 10
 * - Auto-refreshes on mount and when week changes.
 */
export default function useVotingPower() {
  const WEEKLY_CAP = 100;
  const VOTE_COST = 10;

  const [power, setPower] = useState(WEEKLY_CAP);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekId, setWeekId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await backendService.getCurrentWeekStatus();
      if (status && typeof status.weekId === "number") {
        setWeekId(status.weekId);
      }
      const res = await backendService.getVotingPower();
      if (typeof res === "number" && Number.isFinite(res)) {
        setPower(res);
      } else if (res && typeof res.remaining === "number") {
        setPower(res.remaining);
      } else {
        // Fallback if backend not yet implemented: assume full power
        setPower(WEEKLY_CAP);
      }
    } catch (e) {
      setError(e?.message || "Failed to load voting power");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when week changes
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await backendService.getCurrentWeekStatus();
        if (!cancelled && status && typeof status.weekId === "number") {
          if (weekId != null && status.weekId !== weekId) {
            // new week: refresh power
            await refresh();
          }
          setWeekId(status.weekId);
        }
      } catch {}
    };
    const id = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [weekId, refresh]);

  const canAfford = useMemo(() => power >= VOTE_COST, [power]);

  const consume = useCallback((amount = VOTE_COST) => {
    setPower((p) => Math.max(0, p - amount));
  }, []);

  const refund = useCallback((amount = VOTE_COST) => {
    setPower((p) => Math.min(WEEKLY_CAP, p + amount));
  }, []);

  return {
    power,
    weekId,
    loading,
    error,
    WEEKLY_CAP,
    VOTE_COST,
    canAfford,
    refresh,
    consume,
    refund,
  };
}
