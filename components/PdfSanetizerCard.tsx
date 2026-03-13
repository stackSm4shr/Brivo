"use client";

import { useMemo, useState } from "react";

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

type AnalyzeAction = "explain" | "translate" | "draft-reply";

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
    regex: /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:[\s-][A-ZÄÖÜ][a-zäöüß]+)*\b/g,
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

export function PdfSanitizerCard() {
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [action, setAction] = useState<AnalyzeAction>("explain");

  const matches = useMemo(() => findSensitiveData(text), [text]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult("");
    setFileName(file.name);

    try {
      const extracted = await extractPdfText(file);

      if (!extracted.trim()) {
        setError(
          "No selectable text found. This PDF may be scanned and require OCR."
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
    const safeValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const replacement = `[REDACTED ${label.toUpperCase()}]`;
    const regex = new RegExp(safeValue, "g");

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
    setResult("");
    setError("");
  }

  async function sendSanitizedText() {
  setSending(true);
  setError("");
  setResult("");

  try {
    // here we need to send the txt to our api for anaylisis
    setResult(text);

  } catch (err) {
    console.error(err);
    setError("Failed.");
  } finally {
    setSending(false);
  }
}

  const labels = [...new Set(matches.map((m) => m.label))];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>PDF to text sanitizer</CardTitle>
          <CardDescription>
            Upload a PDF, review extracted text, remove sensitive data, then
            send only the cleaned text to your backend.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input type="file" accept="application/pdf" onChange={onFileChange} />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={action === "explain" ? "default" : "outline"}
              onClick={() => setAction("explain")}
            >
              Explain
            </Button>
            <Button
              type="button"
              variant={action === "translate" ? "default" : "outline"}
              onClick={() => setAction("translate")}
            >
              Translate
            </Button>
            <Button
              type="button"
              variant={action === "draft-reply" ? "default" : "outline"}
              onClick={() => setAction("draft-reply")}
            >
              Draft reply
            </Button>
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground">Extracting text...</p>
          )}
          {fileName && !loading && (
            <p className="text-sm text-muted-foreground">
              Loaded file: {fileName}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {!!text && (
        <>
          <Alert variant="destructive">
            <AlertTitle>Review before sending</AlertTitle>
            <AlertDescription>
              Automatic detection helps, but it can miss names, addresses, case
              numbers, and unusual identifiers. Always review the text manually
              before submission.
            </AlertDescription>
          </Alert>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Detected sensitive data</CardTitle>
              <CardDescription>
                Found {matches.length} possible sensitive value
                {matches.length === 1 ? "" : "s"}.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    onClick={() => redactAllByLabel(label)}
                  >
                    Redact all {label}
                  </Button>
                ))}

                <Button type="button" variant="secondary" onClick={resetText}>
                  Reset text
                </Button>
              </div>

              <Separator />

              <ScrollArea className="h-72 rounded-md border p-3">
                <div className="space-y-3">
                  {matches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No obvious sensitive values detected.
                    </p>
                  ) : (
                    matches.slice(0, 150).map((match, index) => (
                      <div
                        key={`${match.label}-${match.value}-${index}`}
                        className="flex items-start justify-between gap-4 rounded-xl border p-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <Badge variant="secondary">{match.label}</Badge>
                          <p className="truncate text-sm">{match.value}</p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => redactValue(match.value, match.label)}
                        >
                          Redact
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
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
                className="min-h-105 font-mono text-sm"
              />

              <div className="flex flex-wrap gap-2">
                <Button onClick={sendSanitizedText} disabled={sending}>
                  {sending ? "Sending..." : "Send sanitized text"}
                </Button>
                <Button type="button" variant="outline" onClick={resetText}>
                  Restore extracted text
                </Button>
              </div>
            </CardContent>
          </Card>

          {!!result && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Backend response</CardTitle>
                <CardDescription>
                  This is the result returned by your API route.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={result}
                  readOnly
                  className="min-h-65 font-mono text-sm"
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}