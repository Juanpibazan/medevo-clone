import { describe, expect, it } from "vitest";
import { recoverPassword } from "@/app/[locale]/(auth)/recuperar-senha/actions";
import { requestPasswordRecovery } from "@/modules/identity/application/email-service";
describe("password recovery stub", () => {
  it("returns the same acknowledgement without using input", async () => {
    await expect(requestPasswordRecovery()).resolves.toEqual({
      accepted: true,
    });
    await expect(requestPasswordRecovery()).resolves.toEqual({
      accepted: true,
    });
  });

  it("rejects malformed input at the server boundary", async () => {
    await expect(recoverPassword({ email: "not-an-email" })).resolves.toEqual({
      accepted: false,
    });
    await expect(
      recoverPassword({ email: "valid@example.test", role: "admin" }),
    ).resolves.toEqual({ accepted: false });
  });

  it("keeps a uniform response for every valid account-shaped request", async () => {
    await expect(
      recoverPassword({ email: "known@example.test" }),
    ).resolves.toEqual({ accepted: true });
    await expect(
      recoverPassword({ email: "unknown@example.test" }),
    ).resolves.toEqual({ accepted: true });
  });
});
