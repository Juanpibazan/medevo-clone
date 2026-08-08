"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/modules/identity/client";
import { useRouter } from "@/i18n/navigation";
export function SignOutButton() {
  const t = useTranslations("app");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await authClient.signOut();
          router.push("/");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {t(pending ? "signingOut" : "signOut")}
    </button>
  );
}
