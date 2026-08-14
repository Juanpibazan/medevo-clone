"use client";

import { useState, useTransition } from "react";
import { authClient } from "@/modules/identity/client";
import { Link } from "@/i18n/navigation";

export function ConfirmarClient({
  email,
  eyebrow,
  title,
  intro,
  checkInbox,
  resendBtn,
  resending,
  resendSuccess,
  resendError,
  backToLogin,
}: {
  email: string;
  eyebrow: string;
  title: string;
  intro: string;
  checkInbox: string;
  resendBtn: string;
  resending: string;
  resendSuccess: string;
  resendError: string;
  backToLogin: string;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleResend = () => {
    if (!email) return;
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const { error: err } = await authClient.sendVerificationEmail({
          email,
          callbackURL: `${window.location.origin}/pt-BR/onboarding`,
        });

        if (err) {
          setError(resendError);
        } else {
          setMessage(resendSuccess);
        }
      } catch {
        setError(resendError);
      }
    });
  };

  return (
    <div className="card flex flex-col gap-4 p-6 text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="text-2xl font-bold text-[#102A43]">{title}</h1>
      <p className="text-sm text-slate-600">{intro}</p>
      {email && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-semibold break-all text-[#102A43]">
          {email}
        </p>
      )}
      <p className="text-sm text-slate-500">{checkInbox}</p>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={isPending || !email}
        className="w-full cursor-pointer rounded-xl bg-[#13A89E] py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#0f8e85] disabled:opacity-50"
      >
        {isPending ? resending : resendBtn}
      </button>

      <Link
        href="/entrar"
        className="mt-2 block text-sm font-semibold text-[#102A43] hover:underline"
      >
        {backToLogin}
      </Link>
    </div>
  );
}
