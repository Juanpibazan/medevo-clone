# ADR 0001: Monolito modular con Next.js

- Estado: accepted
- Fecha: 2026-08-08

## Decisión

Usar Next.js App Router y TypeScript estricto como monolito modular. Cada módulo separa dominio, aplicación e infraestructura y expone una API interna. Server Components son el valor predeterminado; componentes cliente solo cubren interacción. La UI no accede directamente a datos.

Los futuros módulos `content`, `practice`, `learning`, `billing`, `analytics` y `ai` se añadirán por vertical slice. No se crean microservicios ni tablas anticipadas.

## Consecuencias

El despliegue y las transacciones permanecen simples. Las fronteras requieren revisión de imports para evitar acoplamiento accidental.
