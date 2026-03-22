type Letter = {
  id: string;
  title: string;
  sender: string;
  date: string;
  cleanText?: string;
  explanation?: string;
  reply?: string;
};

const mockLetters: Record<string, Letter> = {
  "1": {
    id: "1",
    title: "Driving school payment confirmation",
    sender: "Fahrschule",
    date: "22.03.2026",
    cleanText:
      "The driving school informs you that payments will be deducted monthly from your bank account.",
    explanation:
      "You need to confirm your IBAN and ensure sufficient funds are available.",
  },
  "2": {
    id: "2",
    title: "Jobcenter request for documents",
    sender: "Jobcenter",
    date: "18.03.2026",
    cleanText:
      "The Jobcenter requires additional documents such as insurance proof and bank statements.",
    reply:
      "Dear Sir or Madam, I am sending the requested documents. Please confirm receipt.",
  },
  "3": {
    id: "3",
    title: "Translated Jobcenter letter",
    sender: "Jobcenter",
    date: "12.03.2026",
    cleanText: "This is the cleaned version of the original document.",
    explanation:
      "This letter explains your obligations and required documents.",
    reply: "Please find attached the requested information.",
  },
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LetterDetailsPage({ params }: Props) {
  const { id } = await params;

  const letter = mockLetters[id];

  if (!letter) {
    return <div className="p-6">Document not found</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{letter.title}</h1>
        <p className="text-sm text-muted-foreground">
          {letter.sender} · {letter.date}
        </p>
      </div>

      {letter.cleanText && (
        <div>
          <h2 className="text-lg font-medium">Clean text</h2>
          <p className="text-sm text-muted-foreground">{letter.cleanText}</p>
        </div>
      )}

      {letter.explanation && (
        <div>
          <h2 className="text-lg font-medium">Explanation</h2>
          <p className="text-sm text-muted-foreground">{letter.explanation}</p>
        </div>
      )}

      {letter.reply && (
        <div>
          <h2 className="text-lg font-medium">Suggested reply</h2>
          <p className="text-sm text-muted-foreground">{letter.reply}</p>
        </div>
      )}
    </div>
  );
}
