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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
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
        const result = await authClient.signUp.email({
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (result.error) {
          setError(t("invalidCredentials"));
          return;
        }
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
          setError(t("invalidCredentials"));
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
        <div className="field">
          <label htmlFor="name">{t("name")}</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />
        </div>
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
        <p className="error" role="alert">
          {error}
        </p>
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
