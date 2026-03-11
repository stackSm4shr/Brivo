import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 rounded-full border px-3 py-1 text-sm">
          <Image src="/logo.svg" alt="logo" width={80} height={80}></Image>
        </span>

        <h1 className="max-w-6xl text-4xl font-bold tracking-tight sm:text-6xl">
          Brivo turns confusing bureaucracy into clear next steps.
        </h1>

        <p className="mt-6 max-w-2xl text-muted-foreground text-lg">
          Understand, translate, and respond to official letters with AI.
        </p>

        <div className="mt-8 flex gap-4">
          <Button className="w-2xs">
            <Link href="/login">
              Login
            </Link>
          </Button>
          <Button variant={"outline"} className="w-2xs">
            <Link href="/dashboard">
              Go to dashboard
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
