# ADR 0005: Billing multiproveedor Paddle + Suby

- Estado: accepted
- Fecha: 2026-09-03

## Contexto y decisión

MedCiclo acepta Paddle y, bajo feature flag, Suby v3-beta como Merchant of Record. Un contrato neutral conserva proveedor, identificadores externos, estado, fin de acceso y cancelación programada. Drizzle sigue siendo la única capa de esquema. Durante esta entrega las columnas Paddle se conservan y se escriben junto con las neutrales.

El entitlement Premium es único: solamente `active` o `trialing` con `accessEndsAt` futuro. Toda suscripción no terminal bloquea otro checkout. Una cancelación programada conserva acceso hasta su fecha efectiva. Si hay varias suscripciones no terminales heredadas se conserva el acceso aplicable y la cancelación automática se bloquea.

Los webhooks son la fuente final. Se deduplican por `(provider,event_id)`, se serializan por proveedor+suscripción y un evento con fecha anterior no revierte uno reciente. Si dos eventos comparten fecha, los estados terminales tienen precedencia sobre cobro pendiente/pausa, actualización y activación/renovación. Suby se asocia exclusivamente mediante `billing_provider_customers`; Paddle mantiene custom data firmada y `paddle.webhooks.unmarshal()`.

Las suscripciones heredadas sin identificadores externos siguen concediendo acceso según la política neutral y bloquean compras duplicadas, pero no se cancelan automáticamente: la interfaz deriva el caso a soporte para evitar asociarlas por inferencia.

Los intentos se reservan durante 30 minutos. El navegador no puede liberarlos al cerrar un overlay Paddle, porque un cierre simulado después del pago abriría una carrera cross-provider antes del webhook. La interfaz presenta el estado pendiente y el rollback operativo conserva esos registros.

## Seguridad, operación y rollback

Suby usa `fetch` server-only, Zod, timeout e idempotencia estable. Solo se acepta sandbox, HMAC-SHA256 sobre el cuerpo crudo dentro de cinco minutos y checkout HTTPS del host configurado. La API beta puede cambiar casing o contratos; fixtures reales deben revisarse antes de producción.

El rollout aplica la migración compatible y despliega con Suby apagado. El rollback es `SUBY_ENABLED=false`: Paddle continúa y ningún registro se elimina. Retirar columnas Paddle requiere auditoría y otra migración. Producción, KYB, precios definitivos, privacidad y credenciales reales quedan fuera de este ADR.
