"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { DocumentCard, type LetterListItem } from "@/components/DocumentCard";

type LettersResponse = {
  letters?: LetterListItem[];
  error?: string;
};

export default function Page() {
  const [query, setQuery] = useState("");
  const [letters, setLetters] = useState<LetterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLetters() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters`,
          {
            credentials: "include",
          },
        );

        const data = (await response
          .json()
          .catch(() => null)) as LettersResponse | null;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load letters");
        }

        setLetters(data?.letters ?? []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load letters");
      } finally {
        setLoading(false);
      }
    }

    loadLetters();
  }, []);

  const filteredLetters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return letters;
    }

    return letters.filter((letter) => {
      const title = letter.aiResult?.title?.toLowerCase() ?? "";
      const fileName = letter.fileName?.toLowerCase() ?? "";
      const preview = letter.preview?.toLowerCase() ?? "";

      return (
        title.includes(normalizedQuery) ||
        fileName.includes(normalizedQuery) ||
        preview.includes(normalizedQuery)
      );
    });
  }, [letters, query]);

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold">Saved letters</h1>
          <p className="text-sm text-muted-foreground">
            Search by title, filename, or preview.
          </p>
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search saved letters..."
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading letters...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : filteredLetters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No letters found for this search.
        </p>
      ) : (
        <div className="grid gap-4">
          {filteredLetters.map((letter) => (
            <DocumentCard key={letter._id} letter={letter} />
          ))}
        </div>
      )}
    </div>
  );
}
