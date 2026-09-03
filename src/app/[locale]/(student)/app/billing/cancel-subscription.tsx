"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cancelSubscriptionAction } from "./actions";

export function CancelSubscription({ endsAt }: { endsAt: string }) {
  const t = useTranslations("billing");
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        className="button"
        type="button"
        onClick={() => dialog.current?.showModal()}
      >
        {t("cancel")}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="cancel-title"
        aria-describedby="cancel-description"
        className="card"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <h2 id="cancel-title">{t("cancelTitle")}</h2>
        <p id="cancel-description">{t("cancelBody", { date: endsAt })}</p>
        {failed && <p role="alert">{t("cancelError")}</p>}
        <div className="billing-dialog-actions">
          <button
            className="button"
            type="button"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            {t("keepSubscription")}
          </button>
          <button
            className="danger-button"
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => {
              setPending(true);
              setFailed(false);
              void cancelSubscriptionAction()
                .then(() => {
                  dialog.current?.close();
                  router.refresh();
                })
                .catch(() => setFailed(true))
                .finally(() => setPending(false));
            }}
          >
            {pending ? t("canceling") : t("confirmCancel")}
          </button>
        </div>
      </dialog>
    </>
  );
}
