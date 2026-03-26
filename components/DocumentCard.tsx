"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ExplainAiResult = {
  mode: "explain";
  title: string;
};

type DraftReplyAiResult = {
  mode: "draft-reply";
  title: string;
};

type TranslateAiResult = {
  mode: "translate";
  title: string;
  targetLanguage: string;
};

type ConfirmedDeadline = {
  id: string;
  title: string;
  date: string;
  rawText: string;
  createdAt: string;
  done: boolean; // ✅ added
};

export type LetterListItem = {
  _id: string;
  fileName?: string | null;
  action: "explain" | "draft-reply" | "translate";
  preview: string;
  aiResult?: ExplainAiResult | DraftReplyAiResult | TranslateAiResult;
  createdAt: string;
  confirmedDeadlines?: ConfirmedDeadline[];
};

type Props = {
  letter: LetterListItem;
};

export function DocumentCard({ letter }: Props) {
  const router = useRouter();

  function handleClick() {
    router.push(`/letters/${letter._id}`);
  }

  const title = letter.aiResult?.title || letter.fileName || "Untitled letter";

  const formattedDate = new Intl.DateTimeFormat("de-DE").format(
    new Date(letter.createdAt),
  );

  const description = `${letter.fileName || "No filename"} · ${formattedDate}`;

  const savedParts: string[] = [];

  if (letter.action === "explain") {
    savedParts.push("explanation");
  }

  if (letter.action === "draft-reply") {
    savedParts.push("template reply");
  }

  if (letter.action === "translate") {
    savedParts.push("translation");
  }

  const totalDeadlines = letter.confirmedDeadlines?.length ?? 0;

  const doneCount =
    letter.confirmedDeadlines?.filter((d) => d.done).length ?? 0;

  const openCount = totalDeadlines - doneCount;

  if (totalDeadlines > 0) {
    savedParts.push(
      `${totalDeadlines} deadline${totalDeadlines > 1 ? "s" : ""}`
    );

    if (doneCount > 0) {
      savedParts.push(`${doneCount} done`);
    }

    if (openCount > 0) {
      savedParts.push(`${openCount} open`);
    }
  }

  return (
    <Card
      onClick={handleClick}
      className="cursor-pointer rounded-2xl transition hover:scale-[1.01] hover:shadow-md"
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>

          <Badge variant="secondary">{letter.action}</Badge>
        </div>

        {savedParts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {savedParts.map((part) => (
              <Badge
                key={part}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {part}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {letter.preview}
        </p>
      </CardContent>
    </Card>
  );
}