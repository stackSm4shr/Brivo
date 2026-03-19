"use client";

import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, CalendarDays } from "lucide-react";
import { enUS } from "date-fns/locale";

const Page = () => {
  const aiData = {
    detectedDate: "2024-06-25",
    detectedRecipient: "Agentur / or user input",
  };

  const [date, setDate] = useState<Date | undefined>(
    aiData.detectedDate ? new Date(aiData.detectedDate) : new Date(),
  );
  const [recipient, setRecipient] = useState(aiData.detectedRecipient || "");

  return (
    <div className="min-h-screen w-full bg-background p-8 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 font-sans md:flex-row">
        <Card className="flex-1 shrink-0 border-border bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-center text-xl font-bold">
              Calendar
            </CardTitle>
          </CardHeader>

          <CardContent className="flex justify-center p-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={enUS}
              fixedWeeks
              className="border border-border rounded-none p-2"
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
                  "border border-border bg-transparent text-foreground rounded-none",

                outside:
                  "text-muted-foreground opacity-50 aria-selected:bg-primary/80 aria-selected:text-primary-foreground",

                disabled: "text-muted-foreground opacity-30",
              }}
            />
          </CardContent>
        </Card>

        <Card className="w-full border-border bg-card text-card-foreground md:w-80">
          <CardHeader>
            <CardTitle className="text-xl font-bold uppercase tracking-tight text-primary">
              Deadline
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 text-muted-foreground" />

              <div className="flex-1">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest leading-none text-muted-foreground">
                  Date
                </p>

                <p className="text-sm font-bold text-foreground">
                  {date
                    ? date.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Select on calendar"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-border pt-4">
              <User className="mt-0.5 h-5 w-5 text-muted-foreground" />

              <div className="flex-1">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest leading-none text-muted-foreground">
                  Recipient
                </p>

                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter recipient..."
                  className="h-7 border-none bg-transparent p-0 text-sm font-bold italic text-foreground decoration-primary transition-all placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:underline"
                />
              </div>
            </div>

            <div className="mt-6 border border-primary/20 bg-primary/10 p-3 text-center rounded-none">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Add to calendar
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Page;
