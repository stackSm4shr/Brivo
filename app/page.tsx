"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 px-3 py-1">
          <Image
            src="/brivo_landing_no_text.svg"
            alt="Brivo logo"
            width={400}
            height={200}
            className="hidden dark:block"
            priority
          />
          <Image
            src="/brivo_landing_no_text_light.svg"
            alt="Brivo logo"
            width={400}
            height={200}
            className="block dark:hidden"
            priority
          />
        </span>

        <h1 className="max-w-6xl text-xl font-bold tracking-tight sm:text-3xl">
          Turns confusing bureaucracy into clear next steps.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Understand, translate, and respond to official letters with AI.
        </p>

        <div className="mt-8 flex gap-4">
          {loading ? (
            <Button disabled>Loading...</Button>
          ) : user ? (
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}