"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchRoleAction } from "@/app/[locale]/(student)/app/backoffice/backoffice-actions";

export function DevRoleSwitcher({ initialRole }: { initialRole: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const roles = [
    { code: "student", label: "Student" },
    { code: "medical_editor", label: "Editor" },
    { code: "medical_reviewer", label: "Reviewer" },
    { code: "admin", label: "Admin" },
  ];

  return (
    <div
      style={{ display: "inline-flex", flexDirection: "column", gap: "2px" }}
    >
      <select
        aria-label="Switch Role (Dev)"
        disabled={pending}
        value={initialRole}
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          padding: "4px 8px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          backgroundColor: "#f8fafc",
          cursor: "pointer",
        }}
        onChange={(event) => {
          const nextRole = event.currentTarget.value;
          setError("");
          startTransition(async () => {
            try {
              const result = await switchRoleAction(nextRole);
              if (result.success) {
                router.refresh();
              }
            } catch {
              setError("Failed to switch role");
            }
          });
        }}
      >
        {roles.map((r) => (
          <option key={r.code} value={r.code}>
            {r.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ color: "#ef4444", fontSize: "0.7rem" }}>{error}</span>
      )}
    </div>
  );
}
