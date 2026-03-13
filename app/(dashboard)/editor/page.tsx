import { PdfSanitizerCard } from "@/components/PdfSanetizerCard";

const Page = () => {
  return (
    <main className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Document Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          Extract text from a PDF, remove sensitive data, and send only the
          cleaned text to the backend.
        </p>
      </div>

      <PdfSanitizerCard />
    </main>
  );
};

export default Page;