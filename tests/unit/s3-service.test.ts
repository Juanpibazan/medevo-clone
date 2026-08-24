import { describe, expect, it, vi } from "vitest";

describe("S3 Service Configuration Validation", () => {
  it("throws a descriptive error when AWS S3 environment variables are missing", async () => {
    // Save original environment
    const originalEnv = { ...process.env };

    // Remove S3 configuration variables
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    delete process.env.AWS_S3_BUCKET_NAME;

    // Reset modules and import dynamically to evaluate module scope with empty env
    vi.resetModules();
    const { getUploadPresignedUrl } = await import("@/lib/s3");

    await expect(
      getUploadPresignedUrl("test-image.png", "image/png"),
    ).rejects.toThrow(/Configuração do AWS S3 ausente ou incompleta/);

    // Restore original environment
    process.env = originalEnv;
  });
});
