# Migración 0001: progreso de onboarding

La migración añade `profiles.onboarding_completed_step` con valor inicial `0` y restricciones para el objetivo Revalida, progreso, estado y disponibilidad semanal. La columna representa el mayor paso confirmado; el paso pendiente se deriva sumando uno y el paso que se revisa visualmente proviene de la URL, sin reducir el progreso persistido. Los perfiles creados por el bootstrap son compatibles: comienzan en `not_started`, sin disponibilidad y con objetivo `revalida`.

## Verificación

Aplicar sobre una base limpia con `npm run db:migrate` y ejecutar `npm run test:integration`. Antes de aplicarla sobre datos externos, auditar que no existan objetivos distintos de `revalida`, disponibilidades fuera de 60–2400 minutos o que no sean múltiplos de 30, ni estados de onboarding preexistentes incompatibles.

## Rollback operativo

Si se necesita revertir antes de que otras funciones dependan del nuevo progreso, eliminar las cinco restricciones `profiles_*` añadidas por la migración y después eliminar la columna `onboarding_completed_step`. El rollback no transforma ni elimina `locale`, `tentative_exam_date`, `weekly_study_minutes` u `onboarding_status`. Drizzle no ejecuta este rollback automáticamente; debe revisarse y aplicarse como una migración compensatoria versionada.
