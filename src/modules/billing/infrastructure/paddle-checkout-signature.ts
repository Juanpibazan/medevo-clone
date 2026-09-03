import { createHmac, timingSafeEqual } from "node:crypto";

function signatureFor(userId: string, secret: string) {
  return createHmac("sha256", secret)
    .update(userId, "utf8")
    .digest("base64url");
}

export function createPaddleCheckoutCustomData(userId: string, secret: string) {
  return {
    app_user_id: userId,
    app_user_signature: signatureFor(userId, secret),
  };
}

export function verifyPaddleCheckoutUser(
  userId: string,
  signature: string,
  secret: string,
) {
  const expected = Buffer.from(signatureFor(userId, secret), "utf8");
  const received = Buffer.from(signature, "utf8");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
