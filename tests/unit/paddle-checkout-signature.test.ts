import { describe, expect, it } from "vitest";

import {
  createPaddleCheckoutCustomData,
  verifyPaddleCheckoutUser,
} from "@/modules/billing/infrastructure/paddle-checkout-signature";

describe("Paddle checkout user binding", () => {
  it("accepts the server-signed user and rejects a forged user id", () => {
    const secret = "checkout-signing-secret-at-least-32-chars";
    const customData = createPaddleCheckoutCustomData("user-1", secret);

    expect(
      verifyPaddleCheckoutUser(
        customData.app_user_id,
        customData.app_user_signature,
        secret,
      ),
    ).toBe(true);
    expect(
      verifyPaddleCheckoutUser("user-2", customData.app_user_signature, secret),
    ).toBe(false);
  });
});
