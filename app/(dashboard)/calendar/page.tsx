"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiCalendarLine, RiFileTextLine } from "@remixicon/react";
import { enUS } from "date-fns/locale";
import { useDeadlineCount } from "@/context/deadline-count-context";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  rawText: string;
  done: boolean;
  letterId: string;
  fileName?: string | null;
};

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const Page = () => {
  const router = useRouter();
  const { refreshDeadlineCount } = useDeadlineCount();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyDeadlineId, setBusyDeadlineId] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters/calendar/events`,
          {
            credentials: "include",
          },
        );

        const data = (await response.json().catch(() => null)) as
          | { events?: CalendarEvent[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load calendar events");
        }

        setEvents(data?.events ?? []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    }

    void loadEvents();
  }, []);

  async function deleteDeadline(letterId: string, deadlineId: string) {
    const confirmed = window.confirm(
      "Delete this saved deadline? This cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setBusyDeadlineId(deadlineId);
      setError("");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters/${letterId}/deadlines/${deadlineId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete deadline");
      }

      setEvents((prev) => prev.filter((event) => event.id !== deadlineId));
      await refreshDeadlineCount();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete deadline");
    } finally {
      setBusyDeadlineId(null);
    }
  }

  async function toggleDeadlineDone(
    letterId: string,
    deadlineId: string,
    done: boolean,
  ) {
    try {
      setBusyDeadlineId(deadlineId);
      setError("");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters/${letterId}/deadlines/${deadlineId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ done }),
        },
      );

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update deadline");
      }

      setEvents((prev) =>
        prev.map((event) =>
          event.id === deadlineId ? { ...event, done } : event,
        ),
      );

      await refreshDeadlineCount();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update deadline");
    } finally {
      setBusyDeadlineId(null);
    }
  }

  const eventDates = useMemo(() => {
    return events.map((event) => {
      const [year, month, day] = event.date.split("-").map(Number);
      return new Date(year, month - 1, day);
    });
  }, [events]);

  const selectedDateKey = selectedDate ? formatLocalDate(selectedDate) : null;

  const eventsForSelectedDate = events.filter(
    (event) => event.date === selectedDateKey,
  );

  return (
    <div className="min-h-screen w-full bg-background p-8 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 font-sans md:flex-row">
        <Card className="flex-1 shrink-0 border-border bg-card text-card-foreground rounded-xl">
          <CardHeader>
            <CardTitle className="text-center text-xl font-bold">
              Calendar
            </CardTitle>
          </CardHeader>

          <CardContent className="flex justify-center p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={enUS}
              fixedWeeks
              modifiers={{ hasEvent: eventDates }}
              className="rounded-none border border-border p-2"
              classNames={{
                months: "flex flex-col",
                month: "space-y-4",
                caption: "flex items-center justify-center gap-2 pt-1",
                caption_label: "text-lg font-medium text-foreground",
                nav: "flex items-center gap-1",
                nav_button:
                  "h-8 w-8 rounded-none border border-transparent bg-transparent p-0 text-foreground hover:bg-muted hover:text-foreground",

                head_row: "flex",
                head_cell:
                  "h-10 w-10 rounded-none text-[0.9rem] font-normal text-muted-foreground",

                row: "mt-2 flex w-full",
                cell: "relative h-10 w-10 p-0 text-center text-sm",

                day: "h-10 w-10 p-0",
                day_button:
                  "h-10 w-10 rounded-none border border-transparent bg-transparent p-0 font-normal text-foreground transition-colors hover:bg-muted hover:text-foreground aria-selected:border-primary aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-0",

                selected:
                  "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",

                today:
                  "rounded-none border border-border bg-transparent text-foreground",

                outside:
                  "text-muted-foreground opacity-50 aria-selected:bg-primary/80 aria-selected:text-primary-foreground",

                disabled: "text-muted-foreground opacity-30",
              }}
              modifiersClassNames={{
                hasEvent:
                  "border border-primary bg-primary/10 text-foreground rounded-none",
              }}
            />
          </CardContent>
        </Card>

        <Card className="w-full border-border bg-card text-card-foreground md:w-80 rounded-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold uppercase tracking-tight text-primary">
              Deadlines
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-start gap-3">
              <RiCalendarLine className="mt-0.5 h-5 w-5 text-muted-foreground" />

              <div className="flex-1">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest leading-none text-muted-foreground">
                  Date
                </p>

                <p className="text-sm font-bold text-foreground">
                  {selectedDate
                    ? selectedDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Select on calendar"}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest leading-none text-muted-foreground">
                Saved deadlines
              </p>

              {loading ? (
                <p className="text-sm text-muted-foreground">
                  Loading deadlines...
                </p>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : eventsForSelectedDate.length === 0 ? (
                <div className="rounded-none border border-primary/20 bg-primary/10 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                    No deadlines
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No saved deadlines for this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventsForSelectedDate.map((event) => (
                    <div
                      key={event.id}
                      className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start gap-3">
                        <RiFileTextLine className="mt-0.5 h-5 w-5 text-muted-foreground" />

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <p
                              className={`text-sm font-bold ${
                                event.done
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {event.title}
                            </p>

                            <Badge
                              className="rounded-none"
                              variant={event.done ? "secondary" : "default"}
                            >
                              {event.done ? "Done" : event.date}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {event.rawText}
                          </p>

                          {event.fileName && (
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Source: {event.fileName}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/letters/${event.letterId}`)}
                              disabled={busyDeadlineId === event.id}
                            >
                              Open letter
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleDeadlineDone(
                                  event.letterId,
                                  event.id,
                                  !event.done,
                                )
                              }
                              disabled={busyDeadlineId === event.id}
                            >
                              {busyDeadlineId === event.id
                                ? "Saving..."
                                : event.done
                                  ? "Mark undone"
                                  : "Mark done"}
                            </Button>

                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                deleteDeadline(event.letterId, event.id)
                              }
                              disabled={busyDeadlineId === event.id}
                            >
                              {busyDeadlineId === event.id
                                ? "Working..."
                                : "Delete deadline"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!loading && !error && eventsForSelectedDate.length > 0 && (
              <div className="mt-6 rounded-none border border-primary/20 bg-primary/10 p-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  {eventsForSelectedDate.length} deadline
                  {eventsForSelectedDate.length > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Page;