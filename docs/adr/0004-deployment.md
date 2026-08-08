# ADR 0004: Plataforma de despliegue

- Estado: proposed
- Fecha: 2026-08-08

## Contexto

El hosting es una decisión abierta del propietario. La aplicación requiere Node.js 24 y PostgreSQL, migraciones antes de servir tráfico y HTTPS para cookies seguras.

## Propuesta

Evaluar una plataforma compatible con Next.js estable y PostgreSQL administrado, con backups, secretos, health checks y despliegues reversibles. No se selecciona proveedor ni se añade configuración específica en este bootstrap.
