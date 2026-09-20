"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import {
  ArrowRight,
  Loader2,
  Check,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  AlertCircle,
  User,
} from "lucide-react";

interface IRegisterFormInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register: registerForm,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting: isLoading },
  } = useForm<IRegisterFormInput>();

  const password = watch("password");

  const onSubmit: SubmitHandler<IRegisterFormInput> = async (data) => {
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Something went wrong");
      return;
    }

    router.push("/login?registered=true");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster position="top-right" />
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="relative z-10 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground text-primary">
              <Check className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">TaskFlow</span>
          </div>
          <div className="relative z-10 max-w-lg pb-8">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground/70">One calm place for your work</p>
            <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">Move projects forward, together.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-primary-foreground/75">Plan clearly, keep your team aligned, and turn every important task into visible progress.</p>
          </div>
          <div className="relative z-10 flex items-center gap-3 text-sm text-primary-foreground/70">
            <span className="size-2 rounded-full bg-primary-foreground" /> Trusted by focused teams building what matters.
          </div>
          <div className="pointer-events-none absolute -right-24 top-1/3 size-72 rounded-full border border-primary-foreground/15" />
          <div className="pointer-events-none absolute -right-8 top-[38%] size-44 rounded-full border border-primary-foreground/10" />
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Check className="size-5" />
              </span>
              <span className="font-semibold">TaskFlow</span>
            </div>
            <div className="mb-8">
              <p className="mb-3 text-sm font-medium text-primary">Start your workspace</p>
              <h2 className="text-3xl font-semibold tracking-tight">Create your account</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Set up your team space and start making progress.</p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="size-4" />
                {error}
              </div>
            )}

            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Name
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    {...registerForm("name", { required: "Name is required" })}
                    type="text"
                    placeholder="John Doe"
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
                    aria-invalid={errors?.name ? true : undefined}
                  />
                  {errors?.name && (
                    <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Work email
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    {...registerForm("email", { 
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                      }
                    })}
                    type="email"
                    placeholder="you@company.com"
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
                    aria-invalid={errors?.email ? true : undefined}
                  />
                  {errors?.email && (
                    <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Password
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    {...registerForm("password", { 
                      required: "Password is required",
                      minLength: { value: 8, message: "Password must be at least 8 characters" }
                    })}
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
                    aria-invalid={errors?.password ? true : undefined}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  {errors?.password && (
                    <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Confirm Password
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    {...registerForm("confirmPassword", { 
                      required: "Please confirm your password",
                      validate: (value) => value === password || "Passwords do not match"
                    })}
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
                    aria-invalid={errors?.confirmPassword ? true : undefined}
                  />
                  {errors?.confirmPassword && (
                    <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </label>

              <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="size-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="font-medium text-primary hover:underline" href="/login">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}