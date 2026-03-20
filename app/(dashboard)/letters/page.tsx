"use client";

import { useEffect, useState } from "react";
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

type LetterListItem = {
  _id: string;
  fileName?: string | null;
  action: "explain" | "draft-reply" | "translate";
  preview: string;
  aiResult?: ExplainAiResult | DraftReplyAiResult | TranslateAiResult;
  createdAt: string;
};

const Page = () => {
  const [letters, setLetters] = useState<LetterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLetters() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters`,
          {
            credentials: "include",
          },
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load letters");
        }

        setLetters(data.letters ?? []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load letters");
      } finally {
        setLoading(false);
      }
    }

    loadLetters();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Saved letters</h1>
        <p className="text-sm text-muted-foreground">
          Sanitized documents and AI outputs saved in MongoDB.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading letters...</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : letters.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>No saved letters yet</CardTitle>
            <CardDescription>
              Analyze, draft, or translate a document to create your first saved item.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {letters.map((letter) => (
            <Card key={letter._id} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>
                      {letter.aiResult?.title || letter.fileName || "Untitled letter"}
                    </CardTitle>
                    <CardDescription>
                      {letter.fileName || "No filename"} ·{" "}
                      {new Date(letter.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{letter.action}</Badge>
                    {letter.aiResult?.mode === "translate" && (
                      <Badge variant="outline">
                        {letter.aiResult.targetLanguage}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {letter.preview}
                  {letter.preview.length >= 180 ? "..." : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Page;