"use client";

import { type ChangeEvent, useMemo, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type SensitiveMatch = {
  label: string;
  value: string;
  start: number;
  end: number;
};

type AnalyzeAction = "explain" | "draft-reply";

type ExplainResult = {
  mode: "explain";
  title: string;
  summary: string;
  plainLanguageExplanation: string;
  requiredActions: string[];
  deadlines: string[];
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

type AiResult = ExplainResult | DraftReplyResult;

const SENSITIVE_PATTERNS: { label: string; regex: RegExp }[] = [
  {
    label: "Email",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    label: "Phone",
    regex:
      /\b(?:\+49|0)[\s./-]?(?:\(?\d{2,5}\)?[\s./-]?)?\d{3,}[\d\s./-]{3,}\b/g,
  },
  {
    label: "IBAN",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi,
  },
  {
    label: "Date",
    regex: /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g,
  },
  {
    label: "Postal code + city",
    regex:
      /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:[\s-][A-ZÄÖÜ][a-zäöüß]+)*\b/g,
  },
  {
    label: "Street address",
    regex:
      /\b[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*\s+\d{1,4}[a-zA-Z]?\b/g,
  },
  {
    label: "Customer / reference number",
    regex:
      /\b(?:Kundennummer|Customer\s?Number|Invoice\s?No\.?|Rechnung\s?Nr\.?|Aktenzeichen|Reference)\s*[:#]?\s*[A-Z0-9\-\/]{4,}\b/gi,
  },
];

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

function normalizeTextForDetection(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fixSpacedWordsConservatively(text: string) {
  let fixed = text;

  fixed = fixed.replace(
    /\b(?:[A-Za-zÄÖÜäöüß]\s){2,}[A-Za-zÄÖÜäöüß]\b/g,
    (match) => match.replace(/\s/g, "")
  );

  fixed = fixed.replace(/\b(?:\d\s){3,}\d\b/g, (match) =>
    match.replace(/\s/g, "")
  );

  fixed = fixed.replace(
    /\b(?:[A-Za-z0-9._%+-]\s){2,}@[A-Za-z0-9.\s-]+\.[A-Za-z\s]{2,}\b/g,
    (match) => match.replace(/\s/g, "")
  );

  fixed = fixed.replace(/\b(?:[A-Z0-9]\s){10,}[A-Z0-9]\b/g, (match) => {
    const compact = match.replace(/\s/g, "");
    return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(compact) ? compact : match;
  });

  return fixed
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findSensitiveData(text: string): SensitiveMatch[] {
  const normalized = normalizeTextForDetection(text);
  const results: SensitiveMatch[] = [];

  for (const pattern of SENSITIVE_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    for (const match of normalized.matchAll(regex)) {
      if (!match[0] || match.index == null) continue;

      results.push({
        label: pattern.label,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return results.sort((a, b) => a.start - b.start);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  }).promise;

  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any, index: number, arr: any[]) => {
        if (!("str" in item)) return "";

        let text = item.str ?? "";
        const next = arr[index + 1];

        if (next && item.transform && next.transform) {
          const currentX = item.transform[4];
          const nextX = next.transform[4];
          const currentY = item.transform[5];
          const nextY = next.transform[5];

          const xDiff = nextX - currentX;
          const yDiff = Math.abs(nextY - currentY);

          if (yDiff > 5) {
            text += "\n";
          } else if (xDiff > 14) {
            text += " ";
          }
        }

        return text;
      })
      .join("")
      .replace(/\u0000/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const repairedText = fixSpacedWordsConservatively(pageText);
    pages.push(`--- Page ${pageNum} ---\n${repairedText}`);
  }

  return pages.join("\n\n").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [action, setAction] = useState<AnalyzeAction>("explain");

  const matches = useMemo(() => findSensitiveData(text), [text]);
  const labels = [...new Set(matches.map((m) => m.label))];

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);
    setFileName(file.name);

    try {
      const extracted = await extractPdfText(file);

      if (!extracted.trim()) {
        setError("No selectable text found. This PDF may be scanned and require OCR.");
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
    setError("");
  }

  async function sendSanitizedText() {
    if (!text.trim()) {
      setError("There is no text to send.");
      return;
    }

    setSending(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
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
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Request failed");
      }

      setResult(data.result as AiResult);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>PDF to text sanitizer</CardTitle>
          <CardDescription>
            Upload a PDF, review extracted text, remove sensitive data, then send
            only the cleaned text to your backend.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Input
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
              disabled={loading || sending}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={action === "explain" ? "default" : "outline"}
                onClick={() => setAction("explain")}
                disabled={loading || sending}
              >
                Explain
              </Button>

              <Button
                type="button"
                variant={action === "draft-reply" ? "default" : "outline"}
                onClick={() => setAction("draft-reply")}
                disabled={loading || sending}
              >
                Draft reply
              </Button>
            </div>
          </div>

          {loading && (
            <Alert>
              <AlertTitle>Extracting text...</AlertTitle>
              <AlertDescription>
                Reading the PDF and reconstructing selectable text.
              </AlertDescription>
            </Alert>
          )}

          {fileName && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Loaded file</Badge>
              <span className="text-sm text-muted-foreground">{fileName}</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!!text && (
            <>
              <Card className="rounded-2xl border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Review before sending</CardTitle>
                  <CardDescription>
                    Automatic detection helps, but it can miss names, addresses,
                    case numbers, and unusual identifiers. Always review the text
                    manually before submission.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {matches.length} possible sensitive value
                      {matches.length === 1 ? "" : "s"}
                    </Badge>

                    {labels.map((label) => (
                      <Button
                        key={label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => redactAllByLabel(label)}
                      >
                        Redact all {label}
                      </Button>
                    ))}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetText}
                    >
                      Reset text
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Detected sensitive data</h3>

                    {matches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No obvious sensitive values detected.
                      </p>
                    ) : (
                      <ScrollArea className="h-64 rounded-md border p-3">
                        <div className="space-y-3">
                          {matches.slice(0, 150).map((match, index) => (
                            <div
                              key={`${match.label}-${match.start}-${index}`}
                              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
                            >
                              <div className="min-w-0 space-y-1">
                                <Badge variant="secondary">{match.label}</Badge>
                                <p className="break-all text-sm text-muted-foreground">
                                  {match.value}
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  redactValue(match.value, match.label)
                                }
                              >
                                Redact
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Editable extracted text</CardTitle>
                  <CardDescription>
                    Only the text below will be sent to your backend.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-[26rem] font-mono text-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={sendSanitizedText} disabled={sending || loading}>
                      {sending ? "Sending..." : "Send sanitized text"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetText}
                      disabled={sending || loading}
                    >
                      Restore extracted text
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>

      {!!result && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{result.title}</CardTitle>
            <CardDescription>
              This is the structured result returned by your AI backend.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {result.mode === "explain" ? (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold">Summary</h3>
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Plain language explanation</h3>
                  <p className="whitespace-pre-wrap text-sm">
                    {result.plainLanguageExplanation}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Required actions</h3>
                  {renderList(result.requiredActions)}
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Deadlines</h3>
                  {renderList(result.deadlines)}
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Risks</h3>
                  {renderList(result.risks)}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold">Intent summary</h3>
                  <p className="text-sm text-muted-foreground">
                    {result.intentSummary}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Suggested subject</h3>
                  <Input value={result.suggestedReplySubject} readOnly />
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Suggested reply</h3>
                  <Textarea
                    value={result.suggestedReply}
                    readOnly
                    className="min-h-[18rem] text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Missing information</h3>
                  {renderList(result.missingInformation)}
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Tone notes</h3>
                  {renderList(result.toneNotes)}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}