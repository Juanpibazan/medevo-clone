import "server-only";
import { parseSubyConfig } from "../domain/suby-config";

export function getSubyConfig() {
  return parseSubyConfig(process.env);
}
