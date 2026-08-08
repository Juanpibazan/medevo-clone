# ADR 0003: Better Auth para identidad

- Estado: accepted
- Fecha: 2026-08-08

## Decisión

Usar Better Auth con email y contraseña, adaptador Drizzle, sesiones por cookie y acceso inmediato sin verificación de correo. La contraseña se valida en servidor entre 12 y 128 caracteres. El rol del cliente no forma parte del contrato: el servidor aprovisiona de forma idempotente perfil y rol `student` en una transacción y repara ambos al entrar al área protegida.

La recuperación queda tras un puerto `EmailService` desactivado y responde uniformemente, sin persistir, enviar o registrar direcciones ni tokens.

## Consecuencias

Antes de producción se debe revisar rotación de secretos, HTTPS, trusted origins, correo y política de sesiones. Better Auth no genera ni aplica SQL.

El hook `user.create.after` se ejecuta después del alta que administra Better Auth, por lo que no comparte una transacción con la creación base del usuario. Un fallo puede dejar temporalmente una cuenta sin perfil o rol. El acceso protegido mitiga este riesgo mediante aprovisionamiento idempotente y reparador; las pruebas cubren idempotencia, rollback del aprovisionamiento y unicidad concurrente del correo. Antes de producción se evaluará orquestar el alta completa en una única transacción o adoptar el mecanismo transaccional que ofrezca Better Auth en ese momento.
