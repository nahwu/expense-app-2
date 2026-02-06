import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <SignupForm />
    </Suspense>
  );
}
