import { describe, expect, it } from "vitest";
import {
  credentialsSchema,
  registrationSchema,
  sanitizeLocalizedCallback,
} from "@/modules/identity/domain/identity";
describe("identity contracts", () => {
  it("enforces password boundaries", () => {
    expect(
      credentialsSchema.safeParse({
        email: "a@example.com",
        password: "123456789012",
      }).success,
    ).toBe(true);
    expect(
      credentialsSchema.safeParse({ email: "a@example.com", password: "short" })
        .success,
    ).toBe(false);
    expect(
      credentialsSchema.safeParse({
        email: "a@example.com",
        password: "x".repeat(129),
      }).success,
    ).toBe(false);
  });
  it("rejects role injection", () => {
    expect(
      registrationSchema.safeParse({
        name: "Ana",
        email: "ana@example.com",
        password: "123456789012",
        locale: "es",
        role: "admin",
      }).success,
    ).toBe(false);
  });
  it("only accepts internal localized callbacks", () => {
    expect(sanitizeLocalizedCallback("/es/app?tab=1", "es")).toBe(
      "/es/app?tab=1",
    );
    expect(sanitizeLocalizedCallback("//evil.example/path", "es")).toBe(
      "/es/app",
    );
    expect(sanitizeLocalizedCallback("https://evil.example", "pt-BR")).toBe(
      "/pt-BR/app",
    );
    expect(sanitizeLocalizedCallback("/admin", "es")).toBe("/es/app");
  });
});
