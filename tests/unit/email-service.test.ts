import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ResendEmailService } from "../../src/modules/identity/application/email-service";

describe("ResendEmailService Unit Tests", () => {
  const apiKey = "re_test_key";
  const fromEmail = "test@medciclo.com";
  let service: ResendEmailService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "Success",
    });
    vi.stubGlobal("fetch", fetchMock);
    service = new ResendEmailService(apiKey, fromEmail);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should send verification email with correct headers and body", async () => {
    await service.sendVerificationEmail({
      recipient: "student@example.test",
      verificationUrl: "http://localhost:3000/api/auth/verify?token=123",
      locale: "es",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    });

    const body = JSON.parse(options.body);
    expect(body.from).toBe(fromEmail);
    expect(body.to).toBe("student@example.test");
    expect(body.subject).toContain("Verifica tu correo electrónico");
    expect(body.html).toContain(
      "http://localhost:3000/api/auth/verify?token=123",
    );
  });

  it("should enforce the restriction of maximum 2 emails sent during tests", async () => {
    // 1st email
    await service.sendVerificationEmail({
      recipient: "student@example.test",
      verificationUrl: "http://localhost:3000/api/auth/verify?token=123",
      locale: "pt-BR",
    });

    // 2nd email
    await service.sendVerificationEmail({
      recipient: "student@example.test",
      verificationUrl: "http://localhost:3000/api/auth/verify?token=123",
      locale: "pt-BR",
    });

    // 3rd email should fail
    await expect(
      service.sendVerificationEmail({
        recipient: "student@example.test",
        verificationUrl: "http://localhost:3000/api/auth/verify?token=123",
        locale: "pt-BR",
      }),
    ).rejects.toThrow(
      "Test email limit reached (max 2 emails per test session)",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
