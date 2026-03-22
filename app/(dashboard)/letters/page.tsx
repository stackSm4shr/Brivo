"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { DocumentCard, type LetterListItem } from "@/components/DocumentCard";

type LetterWithSender = LetterListItem & {
  sender: string;
};

const mockLetters: LetterWithSender[] = [
  {
    _id: "1",
    fileName: "Fahrschule Letter",
    sender: "Fahrschule",
    action: "explain",
    preview:
      "The driving school asks to confirm the IBAN details and informs that the monthly course fee will be withdrawn automatically from the bank account starting in May.",
    aiResult: {
      mode: "explain",
      title: "Driving school payment confirmation",
    },
    createdAt: new Date().toISOString(),
    savedParts: ["clean text", "explanation"],
  },
  {
    _id: "2",
    fileName: "Jobcenter Letter",
    sender: "Jobcenter",
    action: "draft-reply",
    preview:
      "The Jobcenter requests additional documents such as insurance proof and bank statements before the stated deadline.",
    aiResult: {
      mode: "draft-reply",
      title: "Jobcenter request for documents",
    },
    createdAt: new Date().toISOString(),
    savedParts: ["clean text", "template answer"],
  },
  {
    _id: "3",
    fileName: "Jobcenter Letter Translation",
    sender: "Jobcenter",
    action: "translate",
    preview:
      "This saved package contains the cleaned text, the translation, and the explanation of the official letter.",
    aiResult: {
      mode: "translate",
      title: "Jobcenter translated package",
      targetLanguage: "EN",
    },
    createdAt: new Date().toISOString(),
    savedParts: ["clean text", "translation", "explanation"],
  },
];

export default function Page() {
  const [senderQuery, setSenderQuery] = useState("");

  const filteredLetters = useMemo(() => {
    const normalizedQuery = senderQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return mockLetters;
    }

    return mockLetters.filter((letter) =>
      letter.sender.toLowerCase().includes(normalizedQuery),
    );
  }, [senderQuery]);

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold">Saved letters</h1>
          <p className="text-sm text-muted-foreground">Search by sender.</p>
        </div>

        <Input
          value={senderQuery}
          onChange={(e) => setSenderQuery(e.target.value)}
          placeholder="Search by sender..."
          className="max-w-sm"
        />
      </div>

      {filteredLetters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No letters found for this sender.
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
