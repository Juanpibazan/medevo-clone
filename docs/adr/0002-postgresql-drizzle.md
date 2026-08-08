# ADR 0002: PostgreSQL, pg y Drizzle

- Estado: accepted
- Fecha: 2026-08-08

## Decisión

PostgreSQL 15 es la fuente de verdad. `pg` provee un único pool en `src/db/client.ts`; Drizzle es la capa tipada y el único mecanismo de esquema y migraciones. Better Auth reutiliza la misma instancia Drizzle. El SQL nativo se limita a health checks parametrizables o migraciones revisadas.

## Consecuencias

Las migraciones se versionan en `drizzle/` y deben probarse desde una base limpia. No se permite otro ORM, pool ni sistema de migración.
