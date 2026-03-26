"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import { useDeadlineCount } from "@/context/deadline-count-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type SensitiveMatch = {
  label: string;
  value: string;
  start: number;
  end: number;
};

type SensitivePattern = {
  label: string;
  regex: RegExp;
};

type AnalyzeAction = "explain" | "draft-reply" | "translate";

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

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    label: "email",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    label: "phone",
    regex: /\b(?:\+49|0)[\d\s\-()/]{6,}\d\b/g,
  },
  {
    label: "iban",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi,
  },
  {
    label: "tax id",
    regex: /\b\d{2,4}[\/\s-]?\d{3,6}[\/\s-]?\d{2,6}\b/g,
  },
  {
    label: "date of birth",
    regex:
      /\b(?:0?[1-9]|[12][0-9]|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:19\d{2}|20\d{2})\b/g,
  },
  {
    label: "postcode",
    regex: /\b\d{5}\b/g,
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSensitiveData(text: string): SensitiveMatch[] {
  const results: SensitiveMatch[] = [];
  const seen = new Set<string>();

  for (const pattern of SENSITIVE_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;
      const key = `${pattern.label}-${start}-${end}-${value}`;

      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          label: pattern.label,
          value,
          start,
          end,
        });
      }

      if (match[0].length === 0) {
        regex.lastIndex += 1;
      }
    }
  }

  return results.sort((a, b) => a.start - b.start);
}

function normalizeTextForDetection(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
}

function fixSpacedWordsConservatively(value: string): string {
  const lines = value.split("\n");
  const repaired = lines.map((line) =>
    line
      .replace(/(\w)-\s+(\w)/g, "$1$2")
      .replace(/\b([A-Za-zÄÖÜäöüß])\s(?=[A-Za-zÄÖÜäöüß]\b)/g, "$1"),
  );

  return repaired.join("\n");
}

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = (textContent.items as Array<{ str?: string }>)
      .map((item) => item.str ?? "")
      .join(" ");

    pages.push(pageText);
  }

  return fixSpacedWordsConservatively(
    normalizeTextForDetection(pages.join("\n\n")),
  );
}

function renderList(items: string[]) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None detected.</p>;
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export function PdfSanitizerCard() {
  const { refreshDeadlineCount } = useDeadlineCount();

  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [savedLetterId, setSavedLetterId] = useState<string | null>(null);
  const [action, setAction] = useState<AnalyzeAction>("explain");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [savingDeadlineIndex, setSavingDeadlineIndex] = useState<number | null>(
    null,
  );

  const matches: SensitiveMatch[] = useMemo(
    () => findSensitiveData(text),
    [text],
  );
  const labels: string[] = [...new Set(matches.map((m) => m.label))];

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setSaveMessage("");
    setResult(null);
    setSavedLetterId(null);
    setFileName(file.name);

    try {
      const extracted = await extractPdfText(file);

      if (!extracted.trim()) {
        setError(
          "No selectable text found. This PDF may be scanned and require OCR.",
        );
        setText("");
        setOriginalText("");
        return;
      }

      setText(extracted);
      setOriginalText(extracted);
    } catch (err) {
      console.error(err);
      setError("Failed to extract text from PDF.");
      setText("");
      setOriginalText("");
    } finally {
      setLoading(false);
    }
  }

  function redactValue(value: string, label: string) {
    const replacement = `[REDACTED ${label.toUpperCase()}]`;
    const regex = new RegExp(escapeRegExp(value), "g");
    setText((prev) => prev.replace(regex, replacement));
  }

  function redactAllByLabel(label: string) {
    const pattern = SENSITIVE_PATTERNS.find((p) => p.label === label);
    if (!pattern) return;

    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    setText((prev) => prev.replace(regex, `[REDACTED ${label.toUpperCase()}]`));
  }

  function resetText() {
    setText(originalText);
    setResult(null);
    setSavedLetterId(null);
    setError("");
    setSaveMessage("");
  }

  async function sendSanitizedText() {
    if (!text.trim()) {
      setError("There is no text to send.");
      return;
    }

    if (action === "translate" && !targetLanguage.trim()) {
      setError("Please enter a target language.");
      return;
    }

    setSending(true);
    setError("");
    setSaveMessage("");
    setResult(null);
    setSavedLetterId(null);

    try {
      const aiResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai/document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            action,
            text,
            language: "de",
            ...(action === "translate" ? { targetLanguage } : {}),
          }),
        },
      );

      const aiData = (await aiResponse.json().catch(() => null)) as {
        result?: AiResult;
        error?: string;
      } | null;

      if (!aiResponse.ok || !aiData?.result) {
        throw new Error(aiData?.error || "Request failed");
      }

      const aiResult = aiData.result;
      setResult(aiResult);

      const saveResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            fileName,
            action,
            sanitizedText: text,
            aiResult,
          }),
        },
      );

      const saveData = (await saveResponse.json().catch(() => null)) as {
        letter?: { _id?: string };
        error?: string;
      } | null;

      if (!saveResponse.ok) {
        throw new Error(
          saveData?.error || "AI result created but failed to save",
        );
      }

      setSavedLetterId(saveData?.letter?._id ?? null);
      setSaveMessage("Saved to your letters list.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSending(false);
    }
  }

  async function confirmDeadline(deadline: DeadlineItem, index: number) {
    if (!savedLetterId) {
      setError("Letter must be saved before confirming a deadline.");
      return;
    }

    if (!deadline.isoDate) {
      setError(
        "This detected deadline cannot be saved because no exact date was found.",
      );
      return;
    }

    setSavingDeadlineIndex(index);
    setError("");
    setSaveMessage("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/letters/${savedLetterId}/confirm-deadline`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            title: deadline.label,
            date: deadline.isoDate,
            rawText: deadline.rawText,
          }),
        },
      );

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save deadline");
      }

      await refreshDeadlineCount();
      setSaveMessage("Deadline saved for calendar view.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save deadline.");
    } finally {
      setSavingDeadlineIndex(null);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>PDF to text sanitizer</CardTitle>
        <CardDescription>
          Upload a PDF, review extracted text, remove sensitive data, then send
          only the cleaned text to your backend.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Upload PDF</label>
          <Input type="file" accept="application/pdf" onChange={onFileChange} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={action === "explain" ? "default" : "outline"}
            onClick={() => setAction("explain")}
            disabled={loading || sending}
            type="button"
          >
            Explain
          </Button>
          <Button
            variant={action === "draft-reply" ? "default" : "outline"}
            onClick={() => setAction("draft-reply")}
            disabled={loading || sending}
            type="button"
          >
            Draft reply
          </Button>
          <Button
            variant={action === "translate" ? "default" : "outline"}
            onClick={() => setAction("translate")}
            disabled={loading || sending}
            type="button"
          >
            Translate
          </Button>
        </div>

        {action === "translate" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Target language</label>
            <Input
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              placeholder="English, German, Turkish, Arabic..."
              disabled={loading || sending}
            />
          </div>
        )}

        {loading && (
          <Alert>
            <AlertTitle>Extracting text...</AlertTitle>
            <AlertDescription>
              Reading the PDF and reconstructing selectable text.
            </AlertDescription>
          </Alert>
        )}

        {labels.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {labels.map((label: string) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  onClick={() => redactAllByLabel(label)}
                >
                  Redact all {label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {matches
                .slice(0, 20)
                .map((match: SensitiveMatch, index: number) => (
                  <Badge
                    key={`${match.label}-${match.value}-${index}`}
                    className="cursor-pointer"
                    onClick={() => redactValue(match.value, match.label)}
                  >
                    {match.label}: {match.value}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="Extracted document text will appear here..."
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={sendSanitizedText} disabled={loading || sending}>
            {sending ? "Processing..." : "Analyze and save"}
          </Button>
          <Button
            variant="outline"
            onClick={resetText}
            disabled={loading || sending}
            type="button"
          >
            Reset
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {saveMessage && (
          <Alert>
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{saveMessage}</AlertDescription>
          </Alert>
        )}

        {result?.mode === "explain" && (
          <div className="space-y-4">
            <Separator />

            <div>
              <h3 className="font-semibold">{result.title}</h3>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Plain explanation</h4>
              <p className="text-sm">{result.plainLanguageExplanation}</p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Required actions</h4>
              {renderList(result.requiredActions)}
            </div>

            <div>
              <h4 className="mb-2 font-medium">Detected deadlines</h4>

              {result.deadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No deadlines detected.
                </p>
              ) : (
                <div className="space-y-3">
                  {result.deadlines.map(
                    (deadline: DeadlineItem, index: number) => (
                      <Card key={`${deadline.rawText}-${index}`}>
                        <CardContent className="space-y-2 pt-6">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{deadline.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {deadline.isoDate ?? "No exact ISO date found"}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {deadline.confidence}
                            </Badge>
                          </div>

                          <p className="text-sm">{deadline.rawText}</p>

                          <Button
                            type="button"
                            onClick={() => confirmDeadline(deadline, index)}
                            disabled={
                              savingDeadlineIndex === index ||
                              !deadline.isoDate ||
                              !savedLetterId
                            }
                          >
                            {savingDeadlineIndex === index
                              ? "Saving..."
                              : "Save to calendar"}
                          </Button>
                        </CardContent>
                      </Card>
                    ),
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 font-medium">Risks</h4>
              {renderList(result.risks)}
            </div>
          </div>
        )}

        {result?.mode === "draft-reply" && (
          <div className="space-y-4">
            <Separator />

            <div>
              <h3 className="font-semibold">{result.title}</h3>
              <p className="text-sm text-muted-foreground">
                {result.intentSummary}
              </p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Suggested subject</h4>
              <p className="text-sm">{result.suggestedReplySubject}</p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Suggested reply</h4>
              <Textarea value={result.suggestedReply} readOnly rows={12} />
            </div>

            <div>
              <h4 className="mb-2 font-medium">Missing information</h4>
              {renderList(result.missingInformation)}
            </div>

            <div>
              <h4 className="mb-2 font-medium">Tone notes</h4>
              {renderList(result.toneNotes)}
            </div>
          </div>
        )}

        {result?.mode === "translate" && (
          <div className="space-y-4">
            <Separator />

            <div>
              <h3 className="font-semibold">{result.title}</h3>
              <p className="text-sm text-muted-foreground">
                Target language: {result.targetLanguage}
              </p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Translated text</h4>
              <Textarea value={result.translatedText} readOnly rows={12} />
            </div>

            <div>
              <h4 className="mb-2 font-medium">Notes</h4>
              {renderList(result.notes)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
