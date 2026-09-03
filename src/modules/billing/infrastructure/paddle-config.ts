import "server-only";
import { parsePaddleConfig } from "../domain/paddle-config";

export function getPaddleConfig() {
  return parsePaddleConfig(process.env);
}
