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

export type LetterListItem = {
  _id: string;
  fileName?: string | null;
  action: "explain" | "draft-reply" | "translate";
  preview: string;
  aiResult?: ExplainAiResult | DraftReplyAiResult | TranslateAiResult;
  createdAt: string;
  savedParts?: string[];
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

  return (
    <Card
      onClick={handleClick}
      className="rounded-2xl cursor-pointer transition hover:scale-[1.01] hover:shadow-md"
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>

          {/* можно потом убрать */}
          <Badge variant="secondary">{letter.action}</Badge>
        </div>

        {/* ЖЁЛТЫЕ (theme) части пакета */}
        {letter.savedParts && letter.savedParts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {letter.savedParts.map((part) => (
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
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {letter.preview}
        </p>
      </CardContent>
    </Card>
  );
}
