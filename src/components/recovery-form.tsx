"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { recoverPassword } from "@/app/[locale]/(auth)/recuperar-senha/actions";
import { Link } from "@/i18n/navigation";
export function RecoveryForm() {
  const t = useTranslations("recovery");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(false);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const result = await recoverPassword({ email });
    setDone(result.accepted);
    setError(!result.accepted);
    setPending(false);
  }
  return (
    <>
      {done ? (
        <p className="notice" role="status">
          {t("uniformResponse")}
        </p>
      ) : (
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="recovery-email">{t("email")}</label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={error}
              aria-describedby={error ? "recovery-email-error" : undefined}
              required
            />
          </div>
          {error ? (
            <p className="error" id="recovery-email-error" role="alert">
              {t("invalidEmail")}
            </p>
          ) : null}
          <button className="button" disabled={pending}>
            {pending ? t("working") : t("send")}
          </button>
        </form>
      )}
      <div className="form-links">
        <Link href="/entrar">{t("back")}</Link>
      </div>
    </>
  );
}
