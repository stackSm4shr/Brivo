"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDeadlineCount } from "@/context/deadline-count-context";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DeadlineItem = {
  label: string;
  rawText: string;
  isoDate: string | null;
  confidence: "high" | "medium" | "low";
};

type ExplainResult = {
  mode: "explain";
  title: string;
  summary: string;
  plainLanguageExplanation: string;
  requiredActions: string[];
  deadlines: DeadlineItem[];
  risks: string[];
};

type DraftReplyResult = {
  mode: "draft-reply";
  title: string;
  intentSummary: string;
  suggestedReplySubject: string;
  suggestedReply: string;
  missingInformation: string[];
  toneNotes: string[];
};

type TranslateResult = {
  mode: "translate";
  title: string;
  targetLanguage: string;
  translatedText: string;
  notes: string[];
};

type AiResult = ExplainResult | DraftReplyResult | TranslateResult;

type ConfirmedDeadline = {
  id: string;
  title: string;
  date: string;
  rawText: string;
  createdAt: string;
  done: boolean;
};

type Letter = {
  _id: string;
  fileName?: string | null;
  action: "explain" | "draft-reply" | "translate";
  sanitizedText: string;
  aiResult?: AiResult;
  confirmedDeadlines?: ConfirmedDeadline[];
  createdAt: string;
};

type LetterResponse = {
  letter?: Letter;
  error?: string;
};

function renderList(items: string[]) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">None.</p>;
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function LetterDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { refreshDeadlineCount } = useDeadlineCount();
  const id = params?.id;

  const [letter, setLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadLetter() {
      if (!id) return;

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters/${id}`,
          {
            credentials: "include",
          },
        );

        const data = (await response.json().catch(() => null)) as
          | LetterResponse
          | null;

        if (!response.ok || !data?.letter) {
          throw new Error(data?.error || "Document not found");
        }

        setLetter(data.letter);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load document");
        setLetter(null);
      } finally {
        setLoading(false);
      }
    }

    void loadLetter();
  }, [id]);

  async function handleDelete() {
    if (!id) return;

    const confirmed = window.confirm(
      "Delete this letter? This cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete letter");
      }

      await refreshDeadlineCount();
      router.push("/letters");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/letters")}
          >
            Back
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Loading document...</p>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/letters")}
          >
            Back
          </Button>
        </div>
        <p className="text-sm text-destructive">
          {error || "Document not found"}
        </p>
      </div>
    );
  }

  const title = letter.aiResult?.title || letter.fileName || "Untitled letter";

  return (
    <div className="space-y-6 p-6">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/letters")}
        >
          Back
        </Button>

        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {letter.fileName || "No filename"} ·{" "}
          {new Intl.DateTimeFormat("de-DE").format(new Date(letter.createdAt))}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{letter.action}</Badge>
        {(letter.confirmedDeadlines?.length ?? 0) > 0 && (
          <Badge variant="outline">
            {letter.confirmedDeadlines?.length} saved deadline
            {(letter.confirmedDeadlines?.length ?? 0) > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sanitized text</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {letter.sanitizedText}
          </p>
        </CardContent>
      </Card>

      {letter.aiResult?.mode === "explain" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {letter.aiResult.summary}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plain explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {letter.aiResult.plainLanguageExplanation}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required actions</CardTitle>
            </CardHeader>
            <CardContent>{renderList(letter.aiResult.requiredActions)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detected deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              {letter.aiResult.deadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No detected deadlines.
                </p>
              ) : (
                <div className="space-y-3">
                  {letter.aiResult.deadlines.map((deadline, index) => (
                    <div
                      key={`${deadline.rawText}-${index}`}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{deadline.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {deadline.isoDate ?? "No exact ISO date found"}
                          </p>
                        </div>
                        <Badge variant="secondary">{deadline.confidence}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {deadline.rawText}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risks</CardTitle>
            </CardHeader>
            <CardContent>{renderList(letter.aiResult.risks)}</CardContent>
          </Card>
        </>
      )}

      {letter.aiResult?.mode === "draft-reply" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Intent summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {letter.aiResult.intentSummary}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggested subject</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {letter.aiResult.suggestedReplySubject}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggested reply</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {letter.aiResult.suggestedReply}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Missing information</CardTitle>
            </CardHeader>
            <CardContent>{renderList(letter.aiResult.missingInformation)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tone notes</CardTitle>
            </CardHeader>
            <CardContent>{renderList(letter.aiResult.toneNotes)}</CardContent>
          </Card>
        </>
      )}

      {letter.aiResult?.mode === "translate" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Target language</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {letter.aiResult.targetLanguage}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Translated text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {letter.aiResult.translatedText}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>{renderList(letter.aiResult.notes)}</CardContent>
          </Card>
        </>
      )}

      {(letter.confirmedDeadlines?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved calendar deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {letter.confirmedDeadlines?.map((deadline) => (
                <div key={deadline.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={`font-medium ${
                        deadline.done ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {deadline.title}
                    </p>
                    <Badge variant={deadline.done ? "secondary" : "default"}>
                      {deadline.done ? "Done" : deadline.date}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {deadline.rawText}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}