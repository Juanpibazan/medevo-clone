"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  authClient,
  credentialsSchema,
  registrationSchema,
  sanitizeLocalizedCallback,
  type SupportedLocale,
} from "@/modules/identity/client";
import { Link } from "@/i18n/navigation";

export function AuthForm({ mode }: { mode: "signIn" | "signUp" }) {
  const t = useTranslations("auth");
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendPending, setResendPending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    setResendPending(true);
    setResendSuccess(false);
    try {
      const { error: resendError } = await authClient.sendVerificationEmail({
        email: unverifiedEmail,
        callbackURL: `${window.location.origin}/pt-BR/onboarding`,
      });
      if (resendError) {
        setError(t("errors.resendError"));
      } else {
        setResendSuccess(true);
      }
    } catch {
      setError(t("errors.resendError"));
    } finally {
      setResendPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setUnverifiedEmail("");
    setResendSuccess(false);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    const callback = sanitizeLocalizedCallback(
      new URLSearchParams(window.location.search).get("callbackUrl"),
      locale,
    );
    try {
      if (mode === "signUp") {
        const parsed = registrationSchema.safeParse({ ...data, locale });
        if (!parsed.success) {
          setError(t("validation"));
          return;
        }
        const fullName =
          parsed.data.name ??
          `${parsed.data.firstName ?? ""} ${parsed.data.lastName ?? ""}`.trim();
        const result = await authClient.signUp.email({
          name: fullName,
          email: parsed.data.email,
          password: parsed.data.password,
          callbackURL: `${window.location.origin}/pt-BR/onboarding`,
        });
        if (result.error) {
          setError(t("invalidCredentials"));
          return;
        }
        router.push(
          `/${locale}/cadastro/confirmar?email=${encodeURIComponent(parsed.data.email)}`,
        );
        return;
      } else {
        const parsed = credentialsSchema.safeParse(data);
        if (!parsed.success) {
          setError(t("validation"));
          return;
        }
        const result = await authClient.signIn.email({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (result.error) {
          if (result.error.code === "EMAIL_NOT_VERIFIED") {
            setUnverifiedEmail(parsed.data.email);
            setError(t("errors.emailNotVerified"));
          } else {
            setError(t("invalidCredentials"));
          }
          return;
        }
      }
      router.push(callback);
      router.refresh();
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="form" onSubmit={submit} noValidate>
      {mode === "signUp" && (
        <>
          <div className="field">
            <label htmlFor="firstName">{t("firstName")}</label>
            <input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              minLength={2}
              maxLength={50}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="lastName">{t("lastName")}</label>
            <input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              minLength={2}
              maxLength={50}
              required
            />
          </div>
        </>
      )}
      <div className="field">
        <label htmlFor="email">{t("email")}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">{t("password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signUp" ? "new-password" : "current-password"}
          minLength={12}
          maxLength={128}
          aria-describedby={mode === "signUp" ? "password-help" : undefined}
          required
        />
        {mode === "signUp" && (
          <p id="password-help" className="card-intro">
            {t("passwordHelp")}
          </p>
        )}
      </div>
      {error && (
        <div
          className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
          role="alert"
        >
          <p>{error}</p>
          {unverifiedEmail && (
            <button
              type="button"
              disabled={resendPending}
              onClick={handleResendVerification}
              className="mt-1 cursor-pointer self-start font-bold text-[#102A43] hover:underline disabled:opacity-50"
            >
              {resendPending ? t("working") : t("errors.resendLink")}
            </button>
          )}
          {resendSuccess && (
            <p className="mt-1 font-semibold text-emerald-800">
              {t("errors.resendSuccess")}
            </p>
          )}
        </div>
      )}
      <button className="button" disabled={pending} type="submit">
        {pending ? t("working") : t(mode === "signUp" ? "create" : "enter")}
      </button>
      <div className="form-links">
        {mode === "signIn" ? (
          <>
            <Link href="/recuperar-senha">{t("forgot")}</Link>
            <Link href="/cadastro">{t("needAccount")}</Link>
          </>
        ) : (
          <Link href="/entrar">{t("haveAccount")}</Link>
        )}
      </div>
    </form>
  );
}
