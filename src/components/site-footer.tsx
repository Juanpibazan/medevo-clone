import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("legal.footer");

  return (
    <footer className="mt-16 border-t border-[var(--line)] py-10 text-xs text-[var(--muted)]">
      <div className="shell flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2 max-w-xl">
          <p className="font-semibold text-[var(--navy)]">
            {t("operatorNotice")}
          </p>
          <p className="leading-relaxed">
            {t("disclaimer")}
          </p>
          <p>
            <a
              href="mailto:admin@codingisgiving.com"
              className="text-[var(--teal)] hover:underline focus-visible:outline-none"
            >
              {t("contact")}
            </a>
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <nav className="flex flex-wrap gap-4 text-sm font-medium" aria-label="Links legais">
            <Link
              href="/termos"
              className="text-[var(--navy)] hover:text-[var(--teal)] hover:underline"
            >
              {t("terms")}
            </Link>
            <span aria-hidden="true" className="text-[var(--line)]">
              •
            </span>
            <Link
              href="/privacidade"
              className="text-[var(--navy)] hover:text-[var(--teal)] hover:underline"
            >
              {t("privacy")}
            </Link>
          </nav>
          <p className="text-[11px] text-[var(--muted)]">
            © {new Date().getFullYear()} MedCiclo. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
