"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiCalendarLine, RiFileTextLine, RiTimeLine } from "@remixicon/react";
import { enUS } from "date-fns/locale";

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

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          throw new Error(data?.error || "Failed to load dashboard data");
        }

        setEvents(data?.events ?? []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    void loadEvents();
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayKey = formatLocalDate(today);
  const in14DaysKey = formatLocalDate(addDays(today, 14));

  const openUpcomingDeadlines = useMemo(() => {
    return events
      .filter((event) => !event.done)
      .filter((event) => event.date >= todayKey && event.date <= in14DaysKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, todayKey, in14DaysKey]);

  const eventDates = useMemo(() => {
    return events
      .filter((event) => !event.done)
      .map((event) => parseLocalDate(event.date));
  }, [events]);

  const selectedDateKey = selectedDate ? formatLocalDate(selectedDate) : null;

  const selectedDateEvents = useMemo(() => {
    return events
      .filter((event) => !event.done)
      .filter((event) => event.date === selectedDateKey)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [events, selectedDateKey]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your next deadlines and calendar.
        </p>
      </div>

      {error && (
        <Card className="rounded-xl">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <RiCalendarLine className="h-5 w-5" />
                Calendar
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Open deadlines are highlighted.
              </p>
            </div>

            <Button asChild variant="outline" size="sm">
              <Link href="/calendar">Open full calendar</Link>
            </Button>
          </CardHeader>

          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={enUS}
              fixedWeeks
              modifiers={{ hasEvent: eventDates }}
              className="rounded-md border p-3"
              modifiersClassNames={{
                hasEvent: "border border-primary bg-primary/10 rounded-md",
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <RiTimeLine className="h-5 w-5" />
                Next 14 days
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Only open deadlines are shown.
              </p>
            </CardHeader>

            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading deadlines...</p>
              ) : openUpcomingDeadlines.length === 0 ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-sm font-medium">No upcoming deadlines</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nothing open in the next 14 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openUpcomingDeadlines.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border p-3 transition hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {event.title}
                          </p>
                          {event.fileName && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {event.fileName}
                            </p>
                          )}
                        </div>

                        <Badge variant="secondary">{event.date}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <RiFileTextLine className="h-5 w-5" />
                Selected day
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Open deadlines for the chosen date.
              </p>
            </CardHeader>

            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">Select a date.</p>
              ) : selectedDateEvents.length === 0 ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-sm font-medium">No deadlines</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No open deadlines for this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {event.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {event.rawText}
                          </p>
                        </div>

                        <Button asChild variant="outline" size="sm">
                          <Link href={`/letters/${event.letterId}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}