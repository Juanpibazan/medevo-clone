"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { submitResetPassword } from "@/app/[locale]/(auth)/redefinir-senha/actions";
import { Link } from "@/i18n/navigation";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations("resetPassword");
  const locale = useLocale();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError(t("passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setPending(true);

    try {
      const result = await submitResetPassword({
        password,
        confirmPassword,
        token,
      });

      if (!result.success) {
        if (result.error === "PASSWORDS_DONT_MATCH") {
          setError(t("passwordMismatch"));
        } else if (result.error === "PASSWORD_TOO_SHORT") {
          setError(t("passwordTooShort"));
        } else {
          setError(t("invalidOrExpiredTokenDescription"));
        }
        setPending(false);
        return;
      }

      router.push(`/${locale}/entrar?reset=success`);
      router.refresh();
    } catch {
      setError(t("invalidOrExpiredTokenDescription"));
      setPending(false);
    }
  }

  return (
    <>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="reset-password">{t("newPassword")}</label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
          />
        </div>

        <div className="field">
          <label htmlFor="reset-confirm-password">{t("confirmPassword")}</label>
          <input
            id="reset-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={12}
          />
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="button" type="submit" disabled={pending}>
          {pending ? t("working") : t("submit")}
        </button>
      </form>

      <div className="form-links">
        <Link href="/entrar">{t("back")}</Link>
      </div>
    </>
  );
}
