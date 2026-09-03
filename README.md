# MedCiclo

Base web bilingüe y mobile-first para preparar Revalida. Este bootstrap cubre portada, registro, acceso, cierre de sesión y un área protegida; todavía no implementa onboarding ni práctica médica.

## Requisitos

- Node.js 24 LTS (`.node-version`) y npm
- Podman con `podman compose`
- PostgreSQL 15 provisto por `docker-compose.yml`

## Inicio local

1. Copia `.env.example` a `.env` y sustituye `BETTER_AUTH_SECRET` por al menos 32 caracteres aleatorios.
2. Ejecuta `npm ci`.
3. Inicia PostgreSQL con `podman compose up -d` y comprueba `podman inspect --format '{{.State.Health.Status}}' medciclo-db`.
4. Aplica el esquema con `npm run db:migrate`.
5. Inicia la web con `npm run dev` y visita `http://localhost:3000`.

Solo PostgreSQL se ejecuta en contenedor. La aplicación corre con Node local. `DATABASE_URL` es la única conexión de base de datos y `src/db/client.ts` mantiene el único `pg.Pool` compartido con Drizzle y Better Auth.

## Comandos

- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`
- `npm run test:integration` requiere PostgreSQL migrado
- `npx playwright install chromium` una vez, luego `npm run test:e2e`
- `npm run build`
- `npm run db:generate`, `npm run db:check`, `npm run db:migrate`

La recuperación de contraseña es deliberadamente un stub: no persiste ni envía direcciones o tokens y siempre devuelve el mismo acuse. Debe conectarse a un `EmailService` solo después de elegir proveedor.

## Arquitectura y alcance

El monolito modular usa App Router. Identidad se divide en dominio, aplicación e infraestructura; la UI consume su API pública y no importa tablas ni el cliente de datos. Los módulos futuros `content`, `practice`, `learning`, `billing`, `analytics` y `ai` se crearán únicamente cuando entre su vertical slice. IA seguirá siendo opcional.

Las ramas son cortas y nacen de `main`; una revisión integra cambios verificados. No se hace commit, merge ni despliegue de forma automática desde este bootstrap.

Consulta `docs/adr` para las decisiones y `CONTEXTO_CODEX_MEDEVO_CLONE.md` para el alcance del producto. No uses contenido propietario de terceros.

## Billing sandbox

Paddle permanece como proveedor principal. Suby v3-beta puede habilitarse con `SUBY_ENABLED=true` después de configurar una clave sandbox, secreto de webhook y dos productos recurrentes USD (`pro_…`). Los precios son sin IVA y el checkout añade el impuesto. El endpoint de Suby es `/api/suby/webhook`; debe suscribirse a los seis eventos `subscription.*` documentados en el ADR 0005.

Despliegue seguro: aplicar primero las migraciones 0010 y 0011, desplegar con Suby desactivado, probar checkout y webhook sandbox, y habilitar el flag. Para rollback, desactivar Suby; no se borran suscripciones, vínculos, intentos ni eventos. Nunca registrar secretos, payloads completos o datos de pago.

Un intento de checkout permanece reservado durante 30 minutos o hasta que un webhook confirme la suscripción. Tras cerrar Paddle no se libera desde el navegador: durante esa ventana `/app/billing` muestra la confirmación pendiente y bloquea otra compra para evitar dobles cargos si el webhook llega tarde.
