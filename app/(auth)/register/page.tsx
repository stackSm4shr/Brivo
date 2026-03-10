import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Enter your details below to create a new account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="repeat">Repeat password</Label>
              <Input id="repeat" type="password" required />
            </div>
          </div>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <Button className="w-full">Register</Button>

        <div className="text-sm text-center">Already have an account?</div>

        <Link href="/login" className="w-full">
          <Button variant="outline" className="w-full">
            Login
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
