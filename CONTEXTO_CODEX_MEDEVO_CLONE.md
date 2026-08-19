# MedEvo Clone — Contexto maestro para el Agente

> Documento de arranque para planificar y construir una plataforma fullstack de preparación médica inspirada funcionalmente en MedEvo, con identidad, contenido y código propios.
>
> Última actualización del contexto: 8 de agosto de 2026.

## 1. Propósito de este documento

Este archivo es la fuente inicial de contexto para Codex. Debe permitir que un agente nuevo:

1. entienda el negocio y la experiencia observada en MedEvo;
2. diferencie el MVP de las funciones futuras;
3. proponga una arquitectura fullstack coherente;
4. cree la estructura inicial del repositorio sin inventar requisitos críticos;
5. divida el trabajo en entregables verificables;
6. preserve la seguridad, la trazabilidad médica y los derechos de autor.

Antes de escribir código, Codex debe leer este archivo completo, inspeccionar el repositorio y producir un plan de ejecución. Si existe un `AGENTS.md`, sus instrucciones operativas complementan este documento.

### 1.1 Estado actual del repositorio

El bootstrap técnico, el tramo de identidad/onboarding y el **vertical slice completo de práctica** (sesión de preguntas, corrección, resultados, cuaderno de errores, favoritos y revisión programada FSRS) están totalmente implementados. Este estado describe el código existente al 12 de agosto de 2026 y debe verificarse contra el repositorio antes de planificar cambios:

- Next.js 16 con App Router, React 19, TypeScript estricto, Tailwind CSS 4, `src/`, npm y Node.js 24 LTS.
- Interfaz mobile-first bilingüe desde el inicio, con prefijos obligatorios `pt-BR` y `es`, `next-intl`, Manrope y los tokens de marca de MedCiclo.
- PostgreSQL 15 en Podman para desarrollo; `pg` mantiene el único pool y Drizzle es el único sistema de esquema y migraciones.
- Better Auth con email y contraseña, sesiones por cookie, adaptador Drizzle y verificación obligatoria de correo electrónico activa.
- Portada, registro, acceso, cierre de sesión, recuperación de contraseña deshabilitada de forma segura, health checks y área autenticada.
- Aprovisionamiento idempotente del perfil y rol `student`; reparar el aprovisionamiento no modifica preferencias existentes.
- Onboarding obligatorio, bilingüe y reanudable entre registro y `/app`, con tres pasos guardados incrementalmente: idioma/objetivo Revalida, fecha tentativa opcional y disponibilidad semanal.
- Módulos de dominio `identity`, `content`, `practice` y `learning` implementados con APIs y repositorios Drizzle desacoplados.
- Área de práctica con soporte para sesiones (con versiones congeladas de preguntas para preservar historial), corrección interactiva inmediata, marcas metacognitivas, favoritos y reportes.
- Dashboard central en `/app` que muestra el resumen del perfil y la lista de revisiones pendientes programadas bajo el algoritmo de repetición espaciada FSRS.
- Cuaderno de errores en `/app/errors` para revisar preguntas contestadas incorrectamente o marcadas como favoritos.
- Base de datos inicial sembrada mediante `npm run db:seed` con taxonomía de especialidades y 12 preguntas de Revalida reales.
- CI y scripts locales para formato, lint, tipos, migraciones, pruebas unitarias, integración, E2E y build.
- Soporte para variables de entorno para migraciones y seeds en Neon/Vercel mediante `MIGRATION_DATABASE_URL` y `DATABASE_URL`.
- Módulo de Billing y límites Freemium completamente funcional (con cuota de 4 preguntas diarias para cuentas gratuitas, simulación de pagos, bloqueo visual y pruebas correspondientes).
- Verificación obligatoria de correo electrónico tras el registro, integrada con Resend (llamadas directas de fetch) y Better Auth (requireEmailVerification: true), con pantalla de espera de confirmación y reenvío en `/cadastro/confirmar`, control de error en el inicio de sesión (`/entrar`) y suites de prueba unitaria/integración correspondientes.
- Backoffice Editorial Visual completamente funcional (con panel unificado en `/app/backoffice`, editor de borradores con taxonomía jerárquica y alternativas, flujo de aprobación/comentado para revisores, e inmutabilidad de versiones publicadas mediante auto-incremento de rascunhos nuevos; además de un selector de roles integrado en la cabecera visible en desarrollo y para usuarios administradores/editores en producción) y pruebas automatizadas correspondientes.
- ADR aceptados para monolito modular, PostgreSQL/`pg`/Drizzle, Better Auth y soporte de despliegue.

El siguiente tramo prioritario del vertical slice es:

> analítica de producto y observabilidad

No existen todavía implementaciones de analítica externa o IA (el módulo de IA se mantiene planeado como opcional y desacoplado).

## 2. Visión del producto

Construir una plataforma web responsive de preparación para exámenes médicos que ayude al estudiante a responder tres preguntas:

- ¿Qué debo estudiar hoy?
- ¿Por qué me equivoqué?
- ¿Cuándo debo revisarlo?

La plataforma debe competir mediante foco, calidad editorial, simplicidad, personalización y menor costo operativo. No se busca clonar el sitio, la marca, el banco de preguntas ni la interfaz de MedEvo.

### Propuesta de valor inicial

> Aprueba Revalida con un plan diario adaptable: preguntas seleccionadas, explicaciones confiables y revisión inteligente, en una experiencia simple y asequible.

### Segmento inicial decidido

- Candidatos que se preparan para **Revalida** en Brasil.
- Idiomas previstos: portugués como idioma principal del contenido y español como expansión natural para candidatos latinoamericanos.
- Plataforma inicial: web responsive/PWA. Las apps móviles nativas quedan fuera del MVP.

### Hipótesis de lanzamiento

- Un banco inicial de **500 a 1.000 preguntas de alta calidad** puede aportar más valor que un banco grande con explicaciones inconsistentes.
- El flujo posterior al error es más importante que replicar todos los módulos de MedEvo.
- La confianza clínica debe construirse mediante fuente, autoría, fecha, versión y estado de revisión visibles.
- El tutor con IA no es necesario para validar el primer hábito de estudio.

Estas hipótesis deben medirse; no deben tratarse como hechos ya validados.

## 3. Hallazgos verificados sobre MedEvo

La evaluación se realizó el 29 de julio de 2026 sobre el sitio público y una cuenta Premium autenticada. Se recorrieron las rutas visibles, filtros y estados principales, y se completó una sesión de una pregunta en cada modalidad. No se realizaron compras ni cambios sensibles de cuenta.

### 3.1 Modelo de negocio observado

MedEvo integra en una sola plataforma:

- banco de preguntas médicas;
- correcciones y explicaciones enriquecidas;
- cuaderno de errores y favoritos;
- flashcards con repetición espaciada;
- cronograma adaptativo;
- simulados;
- materiales y StudyLab;
- tutor médico con IA;
- progreso, ranking, logros, rachas y minijuegos;
- mural/comunidad;
- planes individuales e institucionales.

El modelo es freemium. La capa gratuita observada limita preguntas, créditos de IA, materiales, flashcards y cuaderno. La suscripción completa amplía el banco, IA y herramientas de estudio. Se ofrecen ciclos mensual, semestral, anual y de 24 meses, además de licencias institucionales.

### 3.2 Escala observada del banco

- Total con ambas modalidades: **127.436 preguntas**.
- Residência Médica: **124.574**.
- Revalida: **2.862**.

La diferencia de volumen respalda el foco inicial en Revalida. Estos conteos son una fotografía del 29 de julio de 2026 y pueden cambiar.

### 3.3 Arquitectura funcional observada

Se identificaron 17 rutas principales, además de rutas internas de sesiones y resultados:

- `/`
- `/questions`
- `/material-apoio`
- `/notebook`
- `/flashcards`
- `/cronograma`
- `/simulados`
- `/caderno-erros`
- `/dr-will`
- `/mini-jogos`
- `/curriculo`
- `/mural`
- `/progress`
- `/ranking`
- `/conquistas`
- `/download-app`
- `/feedback-suporte`

La conclusión estratégica no es copiar esas 17 rutas. La fuerza de MedEvo proviene del ciclo:

> pregunta → elección → corrección → explicación → autodiagnóstico → revisión → flashcard → próxima recomendación

### 3.4 Flujo de preguntas observado

#### Descubrimiento y filtros

La jerarquía temática visible es:

> especialidad → tema → foco → subfoco

Filtros observados:

- modalidad: Residência Médica y Revalida;
- especialidad y taxonomía jerárquica;
- institución;
- año;
- tipo de prueba;
- estado: todas, nuevas o respondidas;
- calidad: ocultar anuladas, con errores o no revisadas;
- ventana de últimos cinco años;
- dificultad;
- tipo de pregunta.

Los conteos cambian dinámicamente al modificar filtros. El usuario puede buscar una pregunta concreta o crear una sesión filtrada.

#### Configuración de sesión

- nombre opcional;
- cantidad de 1 a miles de preguntas;
- rangos rápidos;
- carpeta;
- modo práctica o simulado.

Permitir una sesión de una sola pregunta reduce fricción y facilita el microestudio.

#### Pantalla de respuesta

- navegación anterior/siguiente y listado de preguntas;
- cronómetro;
- institución, año y metadatos;
- enunciado y alternativas de selección única;
- descarte de alternativas;
- favoritos y acciones adicionales;
- acceso a material, videos y flashcards;
- verificación bloqueada hasta seleccionar una alternativa;
- finalización de sesión.

#### Corrección

- correcto/incorrecto;
- distribución agregada de respuestas de otros usuarios;
- explicación completa o simplificada;
- mapa cognitivo por pasos;
- marca metacognitiva: dominé, duda, vacilé o no sabía;
- comentarios, preguntas semejantes y reporte de error;
- recomendación de flashcards.

#### Resultado

- precisión;
- correctas/incorrectas;
- tiempo total y por pregunta;
- desglose por especialidad, tema, foco, subfoco y dificultad;
- flashcards sugeridas;
- revisión inteligente;
- siguiente sesión personalizada.

### 3.5 Residência versus Revalida

El flujo y la capa analítica son esencialmente los mismos. Cambian el contenido, la procedencia y algunos mapas explicativos. Por tanto, la modalidad debe modelarse como metadato/configuración del contenido y no como una aplicación separada.

### 3.6 UX y marca observadas

- Identidad médica-tecnológica accesible.
- Fondos claros, tarjetas blancas, bordes suaves y sombras ligeras.
- Acentos azules, verdes, amarillos, violetas y rosados.
- Navegación lateral compacta con iconos.
- Dashboard centrado en hábito, racha y siguiente acción.
- Uso intensivo de tarjetas, acordeones, chips, badges y estados.
- Gamificación mediante puntos, logros, ranking, racha y minijuegos.

Problemas u oportunidades observadas:

- demasiadas funciones elevan la carga cognitiva;
- la barra lateral solo con iconos reduce descubrimiento;
- la corrección puede saturar al usuario nuevo por la cantidad de pestañas;
- el cronograma es potente, pero muy denso;
- algunos módulos dependen de masa crítica social;
- ciertos módulos presentan estados de carga perceptibles.

## 4. Identidad de marca definida

El nombre oficial de la plataforma será **MedCiclo**.

### Concepto de marca

> práctica → error → revisión → progreso

La identidad representa el ciclo central de aprendizaje del producto: practicar, identificar errores, revisar de manera inteligente y convertir ese proceso en progreso medible.

### Logotipo

El logotipo de MedCiclo debe expresar este ciclo de aprendizaje mediante una identidad médica-tecnológica propia, clara y reconocible. Su símbolo debe conservar buena legibilidad al reducirse y funcionar como icono de producto, favicon y avatar.

**Fortaleza principal:** representa directamente el diferenciador central de la plataforma y funciona bien como icono.

### Paleta de colores principal

| Color       | Valor     | Función sugerida                                                                                              |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| Azul marino | `#102A43` | Color institucional, texto principal, navegación y superficies de alto contraste                              |
| Turquesa    | `#13A89E` | Acción primaria, progreso, estados positivos y elementos interactivos                                         |
| Coral       | `#FF7A6B` | Acentos, llamados de atención y estados que requieran énfasis sin sustituir los colores semánticos accesibles |

La aplicación debe derivar escalas tonales y tokens semánticos accesibles a partir de esta paleta. El significado de un estado nunca debe depender únicamente del color.

### Tipografía

- Familia principal: **Manrope**.
- Peso del logotipo y encabezados de marca: **SemiBold (600)**.
- Los demás pesos y usos tipográficos deben definirse en el sistema de diseño, priorizando legibilidad, jerarquía clara y rendimiento web.

La implementación debe usar tokens de diseño para colores y tipografía, en lugar de repetir valores hexadecimales o declaraciones de fuente dentro de componentes.

## 5. Principios del producto propio

1. Una acción primaria por pantalla.
2. Diseñar mobile-first y ampliar a escritorio.
3. Mostrar filtros avanzados solo cuando sean necesarios.
4. Explicar por qué una pregunta o revisión fue recomendada.
5. Convertir cada error en una acción de consolidación.
6. Guardar el progreso de manera incremental y resistente a recargas/reconexiones.
7. Mantener IA opcional; el producto esencial debe funcionar sin ella.
8. Separar visualmente contenido médico aprobado de contenido generado.
9. Priorizar accesibilidad: teclado, foco, contraste, lector de pantalla y tamaños táctiles.
10. Crear una identidad original; usar MedEvo solo como referencia competitiva.

## 6. Alcance funcional del MVP

### 6.1 Dentro del MVP

- Autenticación; la recuperación de cuenta conserva por ahora una respuesta genérica y segura, sin emitir tokens, hasta seleccionar un proveedor de correo.
- Onboarding: idioma, objetivo Revalida, fecha tentativa y disponibilidad de estudio.
- Perfil básico y preferencias.
- Backoffice editorial con roles.
- Importación, creación, edición, revisión, publicación, anulación y versionado de preguntas.
- Taxonomía: especialidad, tema, foco y subfoco.
- Banco de preguntas con búsqueda y filtros esenciales.
- Conteos consistentes por filtro.
- Sesiones de 1-N preguntas.
- Modo práctica con corrección inmediata.
- Pantalla responsive de respuesta con cronómetro, descarte, favorito y progreso.
- Corrección trazable y explicación de cada alternativa cuando exista.
- Marca metacognitiva: dominé, duda, vacilé o no sabía.
- Reporte de pregunta problemática.
- Resultados de sesión.
- Cuaderno de errores y favoritos.
- Cola de revisión espaciada basada en FSRS.
- Flashcards asociadas a preguntas y revisión de flashcards.
- Dashboard esencial: qué estudiar hoy, progreso y revisiones pendientes.
- Límites freemium y base de suscripción.
- Analítica de producto, errores y rendimiento.

### 6.2 Fuera del MVP

- Mural/comunidad.
- Duelos en tiempo real y minijuegos.
- Currículo Lattes.
- Apps móviles nativas.
- StudyLab con cargas de documentos.
- Ranking global avanzado.
- Catálogo amplio de logros.
- Cronograma complejo con drag-and-drop.
- Planes institucionales.
- Tutor médico general con IA.
- Generación automática de preguntas publicadas.

No agregar elementos de esta lista durante la construcción inicial sin una decisión explícita del propietario del producto.

## 7. Roles y permisos iniciales

- **Student**: estudia, responde, revisa, reporta y administra sus preferencias.
- **Medical editor**: crea y modifica borradores, adjunta fuentes y responde reportes.
- **Medical reviewer**: aprueba, rechaza, solicita cambios y anula versiones.
- **Admin**: usuarios, taxonomía, planes, configuración y auditoría.

Aplicar autorización por recurso en servidor. Ocultar un botón en la interfaz no constituye autorización.

## 8. Arquitectura técnica de referencia

### 8.1 Decisión arquitectónica

Comenzar como **monolito modular**. No introducir microservicios hasta que exista una necesidad medible de escala, aislamiento o autonomía de equipos.

### 8.2 Stack base propuesto

Codex debe verificar versiones compatibles y documentar cualquier cambio antes de instalar dependencias.

- Framework: Next.js con TypeScript y App Router.
- UI: Tailwind CSS y componentes accesibles.
- Acceso a datos: PostgreSQL → `pg` como driver → Drizzle ORM como capa tipada y generador de migraciones.
- Validación de contratos: esquemas compartidos tipados.
- API: Server Actions y/o Route Handlers sobre servicios de dominio; evitar lógica de negocio dentro de componentes.
- Búsqueda inicial: PostgreSQL Full Text Search y búsquedas por taxonomía.
- Archivos: almacenamiento S3-compatible cuando se incorporen fuentes o imágenes.
- Cache/colas: introducir Redis y un worker solo cuando tareas asíncronas o mediciones lo justifiquen.
- IA: interfaz de proveedor desacoplada, RAG sobre contenido autorizado, salidas estructuradas y caché.
- Observabilidad: errores, logs estructurados, trazas y eventos de producto.

### 8.3 Decisión final de acceso a datos

Para el arranque del proyecto se adopta la siguiente arquitectura:

```text
PostgreSQL
   ↓
pg (node-postgres) como driver
   ↓
Drizzle ORM como capa tipada y generador de migraciones
```

Responsabilidad de cada capa:

- **PostgreSQL** es la fuente de verdad y ejecuta relaciones, restricciones, índices, transacciones, búsqueda de texto completo y consultas agregadas.
- **`pg`** administra la conexión de bajo nivel desde Node.js: pool de conexiones, consultas parametrizadas y transacciones. Drizzle lo utiliza por debajo; el código de dominio no debe crear pools alternativos.
- **Drizzle** define el esquema en TypeScript, aporta inferencia y comprobación de tipos, compone consultas cercanas a SQL y genera migraciones SQL revisables.

#### Motivo de la elección

MedEvo Clone necesitará filtros jerárquicos, conteos dinámicos, sesiones reproducibles, estadísticas, cuaderno de errores, selección adaptativa y FSRS. Drizzle ofrece un equilibrio adecuado entre:

- control visible sobre el SQL y el rendimiento;
- seguridad de tipos de extremo a extremo en TypeScript;
- refactors más seguros cuando cambien tablas o columnas;
- migraciones versionadas e inspeccionables;
- posibilidad de usar capacidades específicas de PostgreSQL sin abandonar la capa principal.

Prisma sigue siendo una alternativa técnicamente válida, especialmente para un producto dominado por CRUD convencional o un equipo que priorice una abstracción mayor y menor exposición a SQL. No se elige inicialmente porque este proyecto se beneficiará de mantener una correspondencia más directa entre consultas, índices y planes de ejecución.

Usar solo `pg` daría control total, pero obligaría a mantener manualmente tipos de resultados, mapeos entre columnas y objetos, composición de consultas y migraciones. Esa carga no aporta una ventaja suficiente para el MVP.

#### Reglas de implementación

- Mantener una única instancia/pool de `pg` apropiada para el entorno de ejecución.
- Acceder a la base mediante repositorios o servicios de los módulos; los componentes de UI no importan `db`, `pg` ni tablas.
- Usar Drizzle para el esquema, consultas ordinarias, transacciones y migraciones.
- Permitir SQL nativo parametrizado solo cuando una consulta no pueda expresarse con claridad o rendimiento suficiente mediante la API de Drizzle.
- Encapsular el SQL nativo, documentar su motivo y cubrirlo con pruebas de integración.
- No introducir Prisma, otro ORM, otro query builder ni un segundo sistema de migraciones en paralelo.
- Revisar las migraciones SQL generadas antes de aplicarlas y ejecutarlas mediante CI/CD; no sincronizar el esquema de producción con cambios implícitos.
- Medir consultas críticas con datos representativos antes de agregar caché, vistas materializadas o preagregaciones.

Esta decisión debe registrarse en un ADR al crear el repositorio. Solo debe reconsiderarse si aparece evidencia concreta —compatibilidad del runtime, limitaciones funcionales, rendimiento medido o experiencia real del equipo— y mediante un nuevo ADR con estrategia de migración.

### 8.4 Organización recomendada del repositorio

Codex puede ajustar nombres después de inspeccionar el estado real del proyecto, pero debe conservar la separación de responsabilidades:

```text
/
├── AGENTS.md
├── README.md
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── adr/
│   └── runbooks/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   ├── (auth)/
│   │   ├── (student)/
│   │   ├── (backoffice)/
│   │   └── api/
│   ├── components/
│   │   ├── ui/
│   │   └── features/
│   ├── modules/
│   │   ├── identity/
│   │   ├── content/
│   │   ├── practice/
│   │   ├── learning/
│   │   ├── billing/
│   │   ├── analytics/
│   │   └── ai/
│   ├── db/
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── queries/
│   ├── lib/
│   ├── styles/
│   └── test/
├── scripts/
└── public/
```

Reglas:

- `app/` orquesta rutas y composición, no concentra reglas de negocio.
- Cada módulo expone una API interna explícita.
- Los componentes de UI no importan directamente el cliente de base de datos.
- Las operaciones sensibles validan sesión, rol, propiedad y entrada en servidor.
- Las decisiones relevantes se registran como ADR en `docs/adr/`.

### 8.5 Módulos de dominio

- **Identity**: usuario, perfil, roles, sesiones, idioma, objetivo y consentimientos.
- **Content**: preguntas, alternativas, fuentes, versiones, taxonomía y workflow médico.
- **Practice**: sesiones, ítems congelados, respuestas, tiempo, descartes, favoritos y marcas.
- **Learning**: dominio estimado, cuaderno de errores, FSRS, flashcards y recomendaciones.
- **Billing**: planes, suscripciones, cuotas y webhooks.
- **Analytics**: eventos, progreso, calidad editorial y métricas agregadas.
- **AI**: prompts versionados, recuperación, generación, costos, caché y auditoría; diferido salvo interfaces mínimas.

## 9. Modelo de datos conceptual mínimo

Los nombres exactos pueden cambiar. El diseño debe preservar las siguientes invariantes.

### 9.1 Identidad

- `users`
- `sessions`
- `accounts`
- `verifications`
- `profiles`
- `roles`
- `user_roles`
- `consents`

El esquema implementado mantiene el objetivo `revalida`, el locale `pt-BR | es`, la fecha tentativa, los minutos semanales y el estado explícito del onboarding. `onboarding_completed_step` representa el mayor paso confirmado:

- `not_started` corresponde al paso `0`;
- `in_progress` corresponde a los pasos `1` o `2`;
- `completed` corresponde al paso `3` y exige disponibilidad informada.

El paso pendiente se deriva de ese máximo. La URL puede solicitar un paso anterior desbloqueado para editarlo mientras el onboarding siga incompleto, pero nunca reduce el progreso. Una vez completado, el estado es terminal y los reenvíos antiguos no modifican el perfil.

La fecha se interpreta como calendario estricto `YYYY-MM-DD` en `America/Sao_Paulo`, desde el día actual hasta dos años calendario inclusive. La disponibilidad admite entre 60 y 2.400 minutos semanales, en múltiplos de 30. Estas reglas se validan en dominio y mediante restricciones de base de datos cuando corresponde.

### 9.2 Exámenes y taxonomía

- `exam_modalities`
- `institutions`
- `exams`
- `taxonomy_nodes` con relación padre/hijo y tipo de nivel
- `question_taxonomy` como relación N:N con peso/prioridad opcional

### 9.3 Contenido editorial

- `questions`: identidad estable de la pregunta.
- `question_versions`: contenido versionado e inmutable una vez publicado.
- `alternatives`: vinculadas a una versión concreta.
- `sources`: procedencia, URL/obra, fecha y derechos de uso.
- `question_sources`.
- `editorial_reviews`: decisión, autor, comentarios y timestamp.
- `content_reports`: motivo, evidencia, triage y resolución.

Estados editoriales sugeridos:

> draft → in_review → approved/published → superseded/annulled/retired

Nunca sobrescribir silenciosamente una versión que ya recibió respuestas.

### 9.4 Práctica

- `study_sessions`: filtros congelados, modo, cantidad y estado.
- `study_session_items`: orden y `question_version_id` inmutable.
- `responses`: alternativa, acierto, tiempo y timestamps.
- `response_events`: selección, descarte, cambio, verificación y navegación cuando se necesite analítica detallada.
- `response_marks`: favorito y marca metacognitiva.

Invariantes:

- una sesión conserva las mismas versiones aunque el contenido cambie después;
- verificar una respuesta debe ser idempotente;
- una recarga no debe perder selecciones ni tiempo confirmado;
- preguntas anuladas conservan historial, pero no contaminan precisión competitiva.

### 9.5 Aprendizaje

- `review_queue`: próximo repaso y estado FSRS.
- `flashcards`: origen, frente, reverso y estado editorial/personal.
- `flashcard_reviews`: rating, fecha y parámetros del algoritmo.
- `mastery_estimates`: estimación por taxonomía, con versión del algoritmo.
- `recommendations`: ítem, razón, algoritmo y estado.

### 9.6 Comercial e IA

- `plans`
- `subscriptions`
- `usage_counters`
- `billing_events`
- `ai_generations`: tipo, proveedor/modelo, prompt versionado, fuentes, costo, latencia y estado de revisión.

## 10. Flujos críticos del MVP

### 10.1 Vertical slice inicial

> registro → onboarding → sesión de 10 preguntas → corrección → resultado → cuaderno de errores → revisión programada

Este flujo debe funcionar de extremo a extremo antes de ampliar el producto.

Estado de avance:

- **Completado:** registro, acceso, sesión persistente, cierre de sesión, guards y onboarding de tres pasos con resumen de perfil.
- **Siguiente entrega:** sesión de 10 preguntas y su modelo mínimo de contenido/práctica.
- **Pendiente después:** corrección, resultado, cuaderno de errores y revisión programada.

### 10.2 Publicación editorial

> borrador → fuentes → revisión médica → aprobación → publicación de versión → monitoreo de reportes → corrección mediante nueva versión o anulación

### 10.3 Generación de sesión

1. Validar usuario, plan y filtros.
2. Consultar preguntas publicadas y elegibles.
3. Aplicar reglas de novedad, exclusiones y calidad.
4. Elegir ítems de forma reproducible.
5. Persistir sesión e ítems con versiones congeladas.
6. Devolver el primer ítem sin revelar la respuesta correcta.

### 10.4 Corrección

1. Persistir la respuesta de forma idempotente.
2. Evaluar contra la versión congelada en servidor.
3. Mostrar explicación canónica aprobada.
4. Guardar marca metacognitiva.
5. Actualizar cola de revisión y progreso.
6. Ofrecer una única siguiente acción clara.

## 11. Estrategia de IA

### 11.1 Orden de adopción

- **P0 futuro**: explicación alternativa basada en fuentes aprobadas.
- **P0 futuro**: sugerencia de flashcards de sesión.
- **P1**: tutor limitado a la pregunta activa y al corpus autorizado.
- **P1**: resúmenes de fuentes privadas por usuario.
- **P2**: mapas cognitivos y preguntas personalizadas.

El MVP debe dejar interfaces extensibles, pero no requiere activar estas funciones.

### 11.2 Reglas obligatorias

- La IA no es la fuente de verdad clínica.
- No publicar automáticamente como contenido canónico.
- Registrar proveedor/modelo, versión de prompt, fuentes, fecha, costo y revisión.
- Proteger el RAG contra prompt injection y separar datos por usuario.
- Cachear por versión de pregunta, idioma y modo de explicación.
- Usar modelos pequeños para extracción/clasificación y reservar modelos mayores para tareas complejas.
- Poder desactivar IA sin romper práctica, corrección ni revisión.

## 12. Seguridad, privacidad, calidad y legal

- Contenido propio, licenciado o legalmente reutilizable.
- No copiar preguntas, explicaciones, marca, personaje ni UI pixel a pixel de MedEvo.
- Cifrado en tránsito y en reposo según infraestructura elegida.
- Secretos fuera del repositorio.
- Validación de entrada y autorización en servidor.
- Protección CSRF cuando corresponda, cookies seguras y rate limiting en auth y endpoints sensibles.
- Registro auditable de cambios editoriales y administrativos.
- Minimización de datos personales, consentimiento, exportación y eliminación.
- Backups y restauración probada antes de producción.
- Revisión jurídica de derechos de autor, términos, privacidad y legislación aplicable en Brasil y mercados objetivo.
- Las explicaciones clínicas importantes requieren revisión humana responsable.

## 13. Rendimiento y accesibilidad

Objetivos iniciales, sujetos a medición real:

- interfaz usable en teléfonos pequeños desde el primer vertical slice;
- navegación completa con teclado;
- estados de foco visibles;
- textos y controles compatibles con lector de pantalla;
- evitar depender solo del color para correcto/incorrecto;
- autosave resistente a conexiones inestables;
- paginación o virtualización donde el banco lo requiera;
- índices y consultas explicadas para filtros y conteos;
- no enviar la respuesta correcta al cliente antes de verificar, salvo que una decisión técnica documentada lo justifique.

## 14. Analítica y métricas

### North Star Metric

**Sesiones de aprendizaje efectivas por usuario activo semanal.**

Una sesión es efectiva cuando el usuario responde, revisa la corrección y completa al menos una acción de consolidación: marca cognitiva, flashcard, revisión o siguiente sesión recomendada.

### Funnel

- Adquisición: visita → registro.
- Activación: primera sesión completada en 24 horas.
- Valor: preguntas válidas, correcciones leídas y revisiones completadas.
- Retención: WAU/MAU, semanas activas y regreso tras error.
- Conversión: free → pago y renovación.
- Calidad: reportes por 1.000 preguntas y tiempo de resolución.
- IA futura: costo por sesión, aceptación, regeneración y reportes médicos.

Definir un contrato de eventos antes de instrumentar. Evitar enviar texto médico o datos personales innecesarios al proveedor de analítica.

## 15. Roadmap orientativo

### Fase 0 — Descubrimiento (2-3 semanas)

- entrevistar 10-15 candidatos de Revalida;
- definir origen legal de las primeras 500 preguntas;
- validar taxonomía y workflow editorial;
- prototipar Plan, Practicar, Corrección y Revisar;
- acordar métricas y criterios de piloto.

Criterio de salida: 20-30 usuarios entienden y valoran el flujo propuesto.

### Fase 1 — MVP (8-10 semanas)

- identidad, onboarding y roles;
- backoffice editorial;
- banco, filtros y sesiones;
- respuesta, corrección y resultados;
- errores, favoritos y progreso;
- base comercial y observabilidad.

Criterio de salida: usuarios completan sesiones recurrentes sin asistencia.

### Fase 2 — Aprendizaje (6-8 semanas)

- FSRS;
- flashcards;
- recomendaciones;
- dashboard y analítica de aprendizaje.

Criterio de salida: mejora medible de retención y revisiones completadas.

### Fase 3 — IA y contenido (6-8 semanas)

- RAG;
- tutor contextual;
- generación asistida de flashcards;
- pipeline avanzado de fuentes.

Criterio de salida: calidad clínica y costo por usuario dentro de umbrales definidos.

### Fase 4 — Escala (8+ semanas)

- simulados;
- cronograma;
- B2B;
- PWA/mobile;
- funciones sociales selectivas.

## 16. Orden recomendado de implementación

1. ~~Crear el bootstrap, ADR iniciales, autenticación, perfil, roles y onboarding.~~ **Completado.**
2. ~~Cerrar el origen legal del contenido inicial y definir taxonomía, estados editoriales y versionado.~~ **Completado.**
3. ~~Diseñar el esquema mínimo de contenido y práctica, junto con sus amenazas e invariantes.~~ **Completado.**
4. ~~Construir el backoffice editorial mínimo necesario para producir preguntas propias o licenciadas.~~ **Completado.** (Soportado mediante base de datos y semilla inicial).
5. ~~Implementar la sesión de 10 preguntas con versiones congeladas, autosave e idempotencia.~~ **Completado.**
6. ~~Añadir verificación, corrección, reporte, favoritos y marcas metacognitivas.~~ **Completado.**
7. ~~Construir resultados y cuaderno de errores.~~ **Completado.**
8. ~~Añadir revisión programada; incorporar FSRS y flashcards solo con el alcance aprobado.~~ **Completado.**
9. ~~Implementar filtros, conteos y generación ampliada de sesiones.~~ **Completado.**
10. ~~Diseñar e implementar el módulo de Billing, planes de suscripción y límites freemium en el backend (e.g. cuota diaria de preguntas).~~ **Completado.**
11. ~~**Vertical Slice — Simulación de pago y límites freemium (Billing)**: Implementar la UI para el flujo de pago con un formulario simulado de tarjeta en `/app/billing` y la lógica para activar inmediatamente el plan Premium al enviar el formulario, desbloqueando los límites diarios en la práctica de preguntas y mostrando el estado activo en el panel del estudiante. Pruebas: integración de transiciones del estado de suscripción y límites freemium.~~ **Completado.**
12. ~~**Vertical Slice — Verificación de correo electrónico real**: Implementar flujo completo de registro con verificación obligatoria. UI: pantalla de espera de confirmación y opción de reenvío en `/cadastro/confirmar`, más aviso y reenvío en `/entrar` ante el error `EMAIL_NOT_VERIFIED`. Backend: Better Auth con `requireEmailVerification: true`, integración de Resend SDK, y límite de 2 correos en tests para evitar abusar del API. Pruebas: unitarias del servicio e integración de envío.~~ **Completado.**
13. ~~**Vertical Slice — Backoffice Editorial Visual**: Interfaz web completa para que editores y revisores médicos gestionen preguntas. UI: listado, creación, edición, borrador, revisión y publicación de preguntas con alternativas. Backend: Server Actions con roles `medical_editor` y `medical_reviewer`. BD: persistencia en `question_versions`, `question_alternatives` y `editorial_reviews`. Pruebas: flujo editorial completo por rol.~~ **Completado.**
14. **Vertical Slice — Selección de preguntas por taxonomía (Filtros)**: Permitir que el estudiante elija qué especialidades, temas, focos o subfocos quiere practicar en cascada antes de iniciar una sesión de 10 preguntas. UI: Selectores en cascada en el Dashboard. Backend: Actualizar `createSession` en `PracticeService` para admitir y resolver de forma recursiva los descendientes del nodo de taxonomía filtrado. Pruebas: Selección de preguntas filtradas y creación de sesión correspondiente.
15. **Vertical Slice — Analítica de Producto y Observabilidad**: UI: instrumentar eventos de práctica y visualización de progreso. Backend: cola de eventos y reportes agregados. BD: tablas para eventos de analítica. Pruebas: agregación e ingesta.
16. **Vertical Slice — Piloto cerrado**: Puesta en marcha con un volumen inicial de usuarios reales para validar la estabilidad de la plataforma y el hábito antes de gamificar o agregar IA.

## 17. Estrategia de pruebas

- Unitarias: reglas de elegibilidad, scoring, FSRS, cuotas y transiciones editoriales.
- Integración: repositorios, autorización, transacciones, idempotencia y webhooks.
- Contrato: endpoints y esquemas compartidos.
- E2E: registro, publicación editorial, sesión, reconexión, corrección, resultados y revisión.
- Accesibilidad: automatizada más recorrido manual con teclado y lector.
- Seguridad: control de acceso, escalamiento de privilegios, rate limiting y exposición de respuestas.
- Rendimiento: consultas de filtros/conteos y creación de sesiones con un volumen representativo.

Cada feature debe incluir pruebas relevantes y comandos de verificación reproducibles.

El slice de onboarding quedó cubierto por pruebas unitarias de dominio/servicio, componentes accesibles, integración con PostgreSQL real y E2E en viewports Pixel 5 y 320 px. La verificación del 8 de agosto de 2026 pasó formato, lint, tipos, comprobación y aplicación de migraciones, 22 pruebas unitarias/de componentes, 6 de integración, 12 E2E, build y Axe en los tres pasos y el resumen. PostgreSQL quedó saludable y una revisión independiente de Seguridad/QA no encontró defectos bloqueantes. Estos conteos son una fotografía de esa entrega, no sustituyen ejecutar nuevamente la suite tras cambios futuros.

## 18. Criterios de aceptación esenciales

- Ninguna respuesta confirmada se pierde al recargar o reconectar.
- Cada respuesta referencia una versión inmutable de pregunta.
- Los conteos de filtros y las sesiones son reproducibles.
- Preguntas anuladas no contaminan precisión ni métricas competitivas.
- El estudiante entiende por qué una alternativa es correcta y las demás no.
- El flujo completo funciona en teléfono pequeño, teclado y lector de pantalla.
- El producto funciona aunque IA esté desactivada.
- Un editor no puede aprobar su propio contenido si se adopta separación de funciones.
- Las acciones administrativas sensibles quedan auditadas.
- Build, lint, typecheck, migraciones y pruebas pasan en un entorno limpio.

## 19. Decisiones abiertas que Codex no debe inventar

### 19.1 Decisiones ya cerradas

- Autenticación: Better Auth con email/contraseña, adaptador Drizzle, acceso inmediato y correo no verificado por ahora.
- Idiomas: interfaz bilingüe `pt-BR` y `es` desde el inicio; `pt-BR` es el fallback.
- Onboarding: obligatorio, reanudable, objetivo Revalida fijo y perfil como fuente canónica del locale para usuarios autenticados.
- Persistencia: PostgreSQL 15, un único pool `pg` y Drizzle como único sistema de esquema/migraciones.
- Desarrollo local: solo PostgreSQL se ejecuta en Podman; Next.js corre con Node local.

### 19.2 Decisiones que siguen abiertas

Antes de cerrar la arquitectura o implementar las áreas afectadas, presentar opciones y obtener decisión del propietario:

1. País de constitución, mercado de cobro inicial y proveedor de pagos.
2. Hosting y servicios administrados.
3. Proveedor de correo transaccional y política de verificación/recuperación de cuenta.
4. Fuente y licenciamiento de las primeras preguntas.
5. Composición exacta del equipo editorial y política de doble revisión.
6. Modelo freemium, cuotas y precio.
7. Fecha objetivo del piloto.
8. Alcance exacto de flashcards/FSRS en la primera entrega.
9. Proveedor de analítica y política de consentimiento.
10. Activación, proveedor y presupuesto de IA.

Para avanzar sin una decisión, Codex puede crear una interfaz, stub o ADR con estado `proposed`; no debe acoplar el sistema a una elección irreversible.

## 20. Próximo encargo recomendado para el Agente

Usar Plan mode y enviar:

```text
Lee completamente CONTEXTO_CODEX_MEDEVO_CLONE.md y cualquier AGENTS.md del repositorio. Inspecciona el estado actual sin modificar archivos. Después:

1. analiza la estructura y las APIs de los módulos `content`, `practice` y `learning` implementados;
2. diseña el esquema de datos y el flujo del módulo `billing` para definir planes (free vs premium) y cuotas de uso (e.g., límite de 10 preguntas diarias en cuentas gratuitas);
3. implementa las validaciones de acceso en el servidor para forzar los límites de uso freemium, asegurando que un estudiante gratuito reciba un bloqueo visual amigable si supera su cuota;
4. añade un stub/simulador de pasarela de pagos para permitir que el estudiante suba de nivel a cuenta Premium;
5. escribe pruebas de integración y unitarias que verifiquen las reglas de cuotas diarias de uso y las transiciones del estado de suscripción;
6. hazme únicamente las preguntas bloqueantes y espera aprobación antes de implementar.

No copies contenido ni diseño propietario de MedEvo. No incluyas IA, gamificación ni funciones fuera del alcance del MVP de cobro. Si delegas, usa subagentes solo para tareas independientes y devuelve una síntesis unificada.
```

## 21. Forma de trabajo esperada del Agente

- Liderar con el resultado esperado y mantener cambios pequeños y revisables.
- Inspeccionar antes de editar.
- Usar `AGENTS.md` para reglas duraderas del repositorio.
- Registrar decisiones arquitectónicas importantes en ADR.
- No instalar dependencias sin justificar propósito, mantenimiento, licencia y alternativa.
- No cambiar archivos ajenos al objetivo del turno.
- Ejecutar y reportar build, lint, typecheck y pruebas relevantes.
- Revisar el diff antes de entregar.
- Pedir aprobación ante decisiones de producto, seguridad o infraestructura con impacto material.
- Mantener una única fuente de verdad para estados, taxonomía y reglas de scoring.

## 22. Definición de “hecho” para el arranque del proyecto

El bootstrap inicial y el tramo principal de práctica se consideran completos al 12 de agosto de 2026. Existen:

- repositorio Git y estrategia de ramas;
- `README.md` con setup reproducible;
- `AGENTS.md` conciso;
- estructura modular implementada con los módulos `identity`, `content`, `practice` y `learning`;
- ADR de arquitectura, autenticación, datos, y soporte de despliegue en Neon/Vercel;
- entorno local y remoto con variables de entorno documentadas (incluyendo `MIGRATION_DATABASE_URL` para Neon);
- base de datos de PostgreSQL totalmente migrada y sembrada (`npm run db:seed`) con taxonomías y preguntas de prueba;
- CI con format/lint/typecheck/tests/build;
- observabilidad inicial operativa;
- identidad, onboarding y el vertical slice completo de práctica (sesión de preguntas, corrección, resultados, cuaderno de errores y FSRS) totalmente funcionales y localizados en `pt-BR` y `es`;
- ninguna dependencia crítica de contenido o infraestructura escondida.

La observabilidad actual es deliberadamente mínima: health checks de vida y preparación sin exponer configuración ni errores internos. Antes de producción siguen pendientes proveedor de hosting, monitoreo operativo, backups/restauración, correo transaccional (verificación real de cuenta), rate limiting y revisión específica de privacidad/seguridad.

## 23. Riesgos principales

| Riesgo                 | Probabilidad | Impacto | Mitigación inicial                                               |
| ---------------------- | -----------: | ------: | ---------------------------------------------------------------- |
| Derechos de contenido  |         Alta | Crítico | Contenido propio/licenciado, fuentes y revisión legal            |
| Error médico           |        Media | Crítico | Workflow editorial, versionado, doble revisión y retiro rápido   |
| Sobrealcance           |         Alta |    Alto | MVP estricto y criterios de salida por fase                      |
| Baja retención         |        Media |    Alto | Micro-sesiones, errores y revisión automática                    |
| Rendimiento de filtros |        Media |    Alto | Índices, consultas medidas, preagregación solo cuando haga falta |
| Costo de IA            |        Media |    Alto | Caché, colas, modelos por tarea, límites y función desactivable  |
| Datos personales       |        Media |    Alto | Minimización, consentimiento, exportación, borrado y auditoría   |
| Falta de masa social   |         Alta |   Medio | Diferir comunidad y ranking social                               |

## 24. Referencias de origen

- Sitio evaluado: https://www.medevo.com.br/
- Planes: https://www.medevo.com.br/planos
- Informe previo disponible en el proyecto: `Informe_Analisis_MedEvo_y_Plan_Competitivo.docx`

Los comportamientos de MedEvo aquí descritos corresponden a la inspección del 29 de julio de 2026. Deben tratarse como análisis competitivo, no como especificación que obligue a replicarlos.
