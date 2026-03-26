"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  rawText: string;
  done: boolean;
  letterId: string;
  fileName?: string | null;
};

type DeadlineCountContextValue = {
  deadlineCount: number;
  loading: boolean;
  refreshDeadlineCount: () => Promise<void>;
};

const DeadlineCountContext = createContext<DeadlineCountContextValue | undefined>(
  undefined,
);

function getTodayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DeadlineCountProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [deadlineCount, setDeadlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshDeadlineCount = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters/calendar/events`,
        {
          credentials: "include",
        },
      );

      const data = (await response.json().catch(() => null)) as
        | { events?: CalendarEvent[] }
        | null;

      if (!response.ok) {
        setDeadlineCount(0);
        return;
      }

      const today = getTodayLocal();

      const upcomingCount = (data?.events ?? []).filter(
        (event) => event.date >= today && !event.done,
      ).length;

      setDeadlineCount(upcomingCount);
    } catch (error) {
      console.error("Failed to refresh deadline count", error);
      setDeadlineCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDeadlineCount();
  }, [refreshDeadlineCount]);

  const value = useMemo(
    () => ({
      deadlineCount,
      loading,
      refreshDeadlineCount,
    }),
    [deadlineCount, loading, refreshDeadlineCount],
  );

  return (
    <DeadlineCountContext.Provider value={value}>
      {children}
    </DeadlineCountContext.Provider>
  );
}

export function useDeadlineCount() {
  const context = useContext(DeadlineCountContext);

  if (!context) {
    throw new Error(
      "useDeadlineCount must be used within a DeadlineCountProvider",
    );
  }

  return context;
}