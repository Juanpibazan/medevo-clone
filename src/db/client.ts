import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { medcicloPool?: Pool };
export const pool =
  globalForDb.medcicloPool ??
  new Pool({ connectionString: env.DATABASE_URL, max: 10 });
if (env.NODE_ENV !== "production") globalForDb.medcicloPool = pool;
export const db = drizzle(pool, { schema });
