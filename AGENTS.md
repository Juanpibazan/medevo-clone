# AGENTS.md — MedEvo Clone

## Propósito y fuentes de verdad

Estas instrucciones aplican a todo el repositorio. Antes de planificar o editar:

1. Lee este archivo completo.
2. Lee `CONTEXTO_CODEX_MEDEVO_CLONE.md` completo.
3. Inspecciona el estado real del repositorio, el historial relevante y los cambios sin confirmar.
4. Si una instrucción contradice una petición explícita del propietario, detente y señala el conflicto.

`CONTEXTO_CODEX_MEDEVO_CLONE.md` define producto, alcance, riesgos y decisiones abiertas. Este archivo define cómo trabajan los agentes. Los ADR de `docs/adr/` registran decisiones técnicas ya aceptadas. El código y las pruebas describen el comportamiento implementado, pero no autorizan ampliar el alcance.

## Objetivo actual

Construir una plataforma web responsive de preparación para Revalida con identidad, contenido y código propios. El primer vertical slice es:

> registro → onboarding → sesión de 10 preguntas → corrección → resultado → cuaderno de errores → revisión programada

Prioriza este ciclo antes de módulos secundarios. No copies preguntas, explicaciones, marca ni interfaz de MedEvo. No agregues funciones excluidas del MVP sin autorización explícita.

## Decisiones técnicas vigentes

- Monolito modular con Next.js, TypeScript y App Router.
- UI mobile-first con Tailwind CSS y componentes accesibles.
- PostgreSQL como fuente de verdad.
- `pg` como driver y único pool de conexiones.
- Drizzle como capa tipada y único sistema de esquema/migraciones.
- Servicios o repositorios de dominio entre UI y datos; los componentes no importan `db`, `pg` ni tablas.
- Server Actions y/o Route Handlers delgados; la lógica de negocio vive en módulos de dominio.
- Validación de entradas y autorización por recurso siempre en servidor.
- IA desacoplada y opcional; el producto esencial debe funcionar sin ella.

No introduzcas Prisma, otro ORM/query builder, microservicios, Redis, workers ni una segunda estrategia de migración sin evidencia, ADR y aprobación.

## Forma de trabajo del agente principal

El agente principal es responsable de:

- comprender la petición y mantener el alcance;
- crear y actualizar el plan;
- definir o aprobar contratos compartidos;
- asignar tareas y propiedad de archivos;
- resolver contradicciones entre subagentes;
- integrar o aplicar los cambios aceptados;
- definir, junto con Seguridad y QA, la estrategia y los criterios de prueba de cada vertical slice;
- clasificar los defectos, asignar correcciones y exigir la nueva verificación correspondiente;
- revisar el diff completo;
- ejecutar o supervisar la suite completa y realizar las verificaciones finales;
- entregar una síntesis única al propietario.

Los “contratos compartidos” incluyen tipos TypeScript, esquemas de validación, DTO/API, estados de dominio, roles/permisos, eventos y relaciones centrales de datos.

Los informes de subagentes de solo lectura regresan al agente principal. El propietario no debe copiar ni aplicar manualmente sus recomendaciones: el agente principal las evalúa y, cuando corresponda, implementa los cambios.

Antes de editar, presenta un plan cuando la tarea sea amplia, ambigua, afecte contratos compartidos o requiera varias etapas. Haz únicamente preguntas bloqueantes. Para cambios pequeños y bien definidos, implementa directamente.

## Estrategia multiagente

Usa subagentes solo cuando existan tareas independientes, acotadas y con un entregable verificable. No delegues para aparentar paralelismo. Mantén al agente principal enfocado en requisitos, decisiones e integración.

### 1. Producto y UX — solo lectura por defecto

Responsabilidades:

- revisar flujos, responsive, accesibilidad y carga cognitiva;
- detectar inconsistencias con el MVP;
- proponer criterios de aceptación y estados de interfaz.

No edita archivos salvo asignación explícita en un worktree o conjunto de archivos propio.

### 2. Datos y contenido médico — solo lectura por defecto

Responsabilidades:

- revisar esquema, taxonomía, versionado e invariantes;
- revisar workflow editorial, fuentes, auditoría y trazabilidad;
- identificar riesgos de integridad, rendimiento y derechos de contenido.

No crea migraciones ni modifica el esquema compartido sin aprobación del agente principal.

### 3. Seguridad y QA — responsable independiente de verificación

Responsabilidades:

- convertir los criterios de aceptación en un plan de pruebas reproducible;
- elaborar threat models y revisar autorización, privacidad, exposición de respuestas e idempotencia;
- ejecutar pruebas unitarias, de integración, contrato y E2E relevantes;
- probar casos normales, límites, errores, recarga, reconexión y condiciones adversas;
- revisar accesibilidad, teclado, responsive, regresiones y criterios de terminado;
- documentar cada defecto con pasos de reproducción, resultado esperado, resultado real, severidad y evidencia;
- volver a probar las correcciones y reportar regresiones o riesgos residuales.

Es de solo lectura sobre código de producción. Puede crear o modificar pruebas, fixtures y utilidades de prueba únicamente cuando el agente principal le asigne archivos o directorios exclusivos. No corrige componentes, dominio, persistencia ni configuración global: el agente principal asigna esas correcciones al implementador o las aplica. El propietario no debe ejecutar ni interpretar manualmente las pruebas.

### 4. Implementador fullstack — escritura permitida y acotada

Sí debe existir. Su función es escribir y aplicar código fullstack de una tarea vertical concreta: UI, servidor, validación, dominio, persistencia y pruebas relacionadas.

Reglas:

- recibe una especificación cerrada, criterios de aceptación y una lista de archivos/directorios propios;
- inspecciona los contratos existentes y no los redefine unilateralmente;
- puede editar únicamente su área asignada;
- no modifica `package.json`, lockfiles, configuración global, contratos compartidos, esquema/migraciones o ADR salvo autorización expresa;
- incluye pruebas relevantes y ejecuta las verificaciones de su alcance;
- devuelve al agente principal resumen, archivos cambiados, decisiones, comandos ejecutados y riesgos pendientes;
- no integra su propio trabajo a la rama principal salvo instrucción explícita.

### Reglas para escrituras paralelas

- En un mismo checkout, solo un agente escritor puede trabajar a la vez. Los demás subagentes permanecen en lectura/revisión.
- Para dos o más agentes escritores simultáneos, usa ramas y worktrees separados.
- Cada escritor debe tener propiedad exclusiva de módulos y archivos; evita solapamientos.
- Los archivos centrales (`package.json`, lockfile, configuración TypeScript/Next.js, esquema compartido, migraciones y contratos globales) pertenecen al agente principal, salvo cesión explícita.
- El agente principal integra en orden, resuelve conflictos y ejecuta la suite completa.
- Nunca des por integrado un hallazgo o parche solo porque un subagente lo recomendó.

## Ciclo obligatorio de calidad por vertical slice

La calidad se comparte, pero el agente principal conserva la responsabilidad final:

1. El agente principal define el comportamiento observable, los criterios de aceptación, los riesgos y los contratos afectados.
2. Seguridad y QA prepara casos felices, límites, errores, abuso, accesibilidad y regresión antes o en paralelo a la implementación, sin bloquear innecesariamente al implementador.
3. El implementador construye el slice y añade las pruebas unitarias y de integración propias del comportamiento modificado.
4. Seguridad y QA ejecuta la verificación independiente aplicable: pruebas automatizadas, E2E en navegador, autorización, seguridad, accesibilidad, responsive, recarga, reconexión e idempotencia.
5. El agente principal clasifica los hallazgos por severidad y alcance, descarta falsos positivos y asigna las correcciones.
6. El implementador corrige el producto; Seguridad y QA vuelve a probar el defecto y la regresión relacionada.
7. El agente principal revisa el diff completo, ejecuta o supervisa la suite final y reporta resultados, bloqueos y riesgos residuales.

Un defecto crítico o alto en el flujo afectado bloquea la entrega. Un defecto medio o bajo solo puede diferirse si el agente principal documenta impacto, mitigación y seguimiento. Nunca rebajes severidad solo para cerrar una tarea.

## Protocolo de implementación

1. Inspecciona antes de editar; no supongas estructura, scripts ni dependencias.
2. Define el resultado observable y los criterios de aceptación.
3. Identifica contratos e invariantes afectados.
4. Implementa el cambio mínimo completo, preferentemente como vertical slice.
5. Añade o actualiza pruebas al mismo tiempo que el comportamiento.
6. Entrega el cambio a Seguridad y QA para su verificación independiente cuando el riesgo o el flujo lo requieran.
7. Corrige hallazgos aceptados y repite las pruebas afectadas.
8. Ejecuta format, lint, typecheck, pruebas y build relevantes usando los scripts reales del repositorio.
9. Revisa el diff y elimina cambios accidentales, código muerto y logs de depuración.
10. Reporta qué cambió, qué verificaste y qué no pudiste verificar.

No inventes comandos. Mientras no exista `package.json`, documenta los comandos propuestos en el plan. Cuando exista, usa el package manager indicado por el lockfile y los scripts del proyecto.

## Convenciones de código y arquitectura

- TypeScript estricto; evita `any`. Si es inevitable, justifica y limita su alcance.
- Componentes pequeños y accesibles; Server Components por defecto y Client Components solo cuando la interacción lo requiera.
- Reglas de negocio puras y testeables dentro del módulo correspondiente.
- No dupliques tipos: deriva tipos de esquemas o contratos compartidos cuando sea posible.
- Valida datos en los límites del sistema; no confíes en datos del cliente.
- Estados de dominio explícitos; evita booleanos ambiguos para workflows complejos.
- Cambios de base de datos mediante migraciones revisables y versionadas.
- SQL nativo solo parametrizado, encapsulado, documentado y cubierto por pruebas de integración.
- No optimices sin medición; mide consultas críticas con datos representativos.
- Mantén secretos y datos sensibles fuera del repositorio y de logs.

## Invariantes críticas

- Una sesión conserva `question_version_id` aunque una pregunta cambie después.
- Una versión publicada no se sobrescribe silenciosamente.
- Verificar una respuesta es idempotente.
- Una recarga o reconexión no pierde respuestas confirmadas.
- La respuesta correcta no se expone antes de la verificación.
- Preguntas anuladas conservan auditoría y no contaminan métricas competitivas.
- La autorización se verifica en servidor por rol, recurso y propiedad.
- La IA no publica contenido médico canónico ni es fuente de verdad clínica.
- El producto sigue funcionando con IA desactivada.

## Seguridad, calidad médica y derechos

- Usa únicamente contenido propio, licenciado o legalmente reutilizable.
- Toda explicación clínica canónica debe tener fuente, versión, autoría, fecha y estado de revisión.
- Separa visual y técnicamente contenido aprobado de contenido generado.
- Audita cambios editoriales y administrativos sensibles.
- Minimiza datos personales; diseña para consentimiento, exportación y eliminación.
- No registres tokens, secretos, contraseñas, respuestas médicas completas ni datos personales innecesarios.
- Antes de pagos, IA o producción, exige revisión específica de seguridad y privacidad.

## Pruebas mínimas por tipo de cambio

- Dominio: unitarias para reglas, transiciones, scoring, cuotas y FSRS.
- Datos: integración para repositorios, transacciones, restricciones e idempotencia.
- API/acciones: validación, autorización, contratos y manejo de errores.
- UI: estados vacío/carga/error/éxito, teclado y responsive.
- Flujo crítico: E2E para registro, sesión, corrección, resultado y revisión.
- Esquema: migración ascendente validada en una base limpia; estrategia de reversión documentada cuando sea riesgosa.

No afirmes que “todo pasa” si no ejecutaste la verificación. Distingue fallos causados por el cambio de bloqueos preexistentes.

## Cambios que requieren aprobación del propietario

- Decisiones abiertas de la sección 18 del documento de contexto.
- Nueva dependencia de producción o cambio de package manager.
- Cambio de ORM, base de datos, autenticación, hosting, pagos, analítica o proveedor de IA.
- Cambio incompatible de contrato compartido o migración destructiva.
- Funcionalidad fuera del MVP.
- Decisión médica, legal o comercial no documentada.
- Acción destructiva, publicación, despliegue o uso de credenciales reales.

Ante un bloqueo, ofrece opciones con impacto y recomendación; no conviertas una hipótesis en requisito.

## Git y alcance

- Conserva cambios preexistentes del propietario y evita editar archivos ajenos a la tarea.
- No uses comandos destructivos ni reescribas historial sin autorización explícita.
- No hagas commit, push, merge, despliegue ni abras PR salvo petición expresa.
- Mantén cambios pequeños y revisables; separa refactors no necesarios.
- Si el árbol está sucio y existe solapamiento, detente y coordina antes de editar.

## Definición de terminado

Una tarea está terminada cuando:

- cumple los criterios de aceptación y respeta el MVP;
- preserva contratos e invariantes o documenta el cambio aprobado;
- incluye pruebas proporcionales al riesgo;
- Seguridad y QA verificó de forma independiente los flujos de riesgo relevante o dejó documentado por qué no aplicaba;
- los defectos encontrados fueron corregidos y reprobados, o diferidos explícitamente con impacto y seguimiento;
- pasan las verificaciones relevantes disponibles;
- se revisó el diff completo;
- no contiene secretos, datos de prueba sensibles ni contenido propietario;
- la documentación y ADR se actualizaron cuando corresponde;
- el agente principal entregó una síntesis única con cambios, validación y pendientes reales.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
