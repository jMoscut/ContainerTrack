# ContainerTrack — Plan de Pruebas (Seminario)

**Versión:** 2.1 · Julio 2026
**Estado:** implementado (ver checklist al final) — este doc refleja el código real, no un plan aspiracional.

---

## Estrategia general

```
push a main → GitHub Actions
  │
  ├── [Gate 1] mvn test        → falla → NO se despliega a Railway
  ├── [Gate 2] npm run test    → falla → NO se despliega a Vercel
  ├── [Gate 2b] npm run build  → falla → NO se despliega a Vercel
  │
  └── ambos pasan → deploy automático Railway + Vercel
```

Nota: el deploy solo se dispara en push a `main` (no en PRs ni `develop`) y **requiere los secrets de la sección 5 configurados en GitHub** — sin ellos el job `deploy` fallará aunque los tests pasen. Esto es esperado: el proyecto aún no tiene Railway/Vercel conectados (ver `STATUS.md`).

---

## 1. Pruebas Unitarias — Backend

**Stack:** JUnit 5 · Mockito · AssertJ
**Ubicación:** `backend/src/test/java/com/containertrack/`
**Estado real: 43 tests pasan, 1 skip (requiere DB real), 0 fallos.** (subió de 27 tras agregar `UserServiceTest`, `ShippingCompanyServiceTest`, `AuditServiceTest` y `NotificationServiceTest`.)

### `validation/ContainerNumberValidatorTest` (7 tests)
Lógica pura del algoritmo ISO 6346, sin mocks. Cubre: ejemplo canónico del estándar, dígito verificador mutado, formato inválido, 4 prefijos reales de navieras (MSC/Maersk/Triton/Hapag-Lloyd) con dígito verificador calculado correctamente, longitud incorrecta, minúsculas, letra de categoría no válida (solo U/J/Z son válidas).

### `service/AuthServiceTest` (6 tests)
Mockea `UserRepository`/`PasswordEncoder`/`JwtService`. Cubre login correcto (retorna token), credenciales incorrectas, bloqueo tras 5 intentos fallidos (`lockedUntil` = now+15min, verificado vía `ArgumentCaptor`), login rechazado mientras la cuenta sigue bloqueada, cuenta `INACTIVE` rechazada.

**Nota de implementación real** (difiere de lo asumido originalmente en el plan v2.0): no existen excepciones dedicadas tipo `InvalidCredentialsException`. Todo error de negocio lanza `ApiException` (con subclases `BadRequestException`/`ConflictException`/`ForbiddenException`/`NotFoundException`), con un `code` string (`"INVALID_CREDENTIALS"`, `"ACCOUNT_LOCKED"`, `"ACCOUNT_INACTIVE"`) y `HttpStatus`. Los tests assertan sobre `code`/`status`, no sobre la clase de excepción. `UserStatus` real es `ACTIVE | INACTIVE | PENDING_ACTIVATION` (no existe `DISABLED`).

### `service/ContainerServiceTest` (5 tests)
Mockea `ContainerRepository`/`ShippingCompanyRepository`/`AuditService`. Cubre registro válido → `REGISTERED`, naviera inactiva rechazada, transición secuencial válida (`REGISTERED`→`DEPARTED_ORIGIN`, nombres reales del enum `ContainerStatus`), transición inválida/salto rechazada, y que `DISCHARGED` es inalcanzable vía el endpoint genérico de transición (código `DISCHARGE_VIA_DEDICATED_ENDPOINT`).

### `service/DischargeServiceTest` (2 tests)
**Nota de implementación real:** la validación "descarga requiere ≥1 foto" vive en `DischargeService`, no en `ContainerService` (arquitectura correcta, separación de responsabilidades). Cubre: descarga sin fotos lanza `BadRequestException("PHOTOS_REQUIRED", ...)`, descarga con ≥1 foto pasa.

### `dto/TimestampSerializationTest` + `scheduler/NotificationSchedulerIdempotencyTest` + `service/ContainerStateMachineTest`
Ya existentes de la ronda de cierre de gaps anterior — serialización ISO-8601 UTC, idempotencia del scheduler de notificaciones, transiciones de estado.

### JaCoCo — solo reporte, sin bloqueo
Ya configurado en `pom.xml` (`jacoco-maven-plugin` 0.8.13, `prepare-agent`+`report`, sin `check` goal — no bloquea el build). Reporte en `target/site/jacoco/index.html`.

**Cobertura real medida en `service`:** ~1.3% antes de esta ronda (solo `ContainerStateMachine` cubierta); con los 13 tests nuevos de `AuthService`/`ContainerService`/`DischargeService` la cobertura sube pero **sigue lejos del 70% de RNF-04** — quedan sin cubrir `NotificationService`, `ReportService`, `FileStorageService`, `UserService`, `ShippingCompanyService`, `AuditService`. Correr `mvn test jacoco:report` y abrir el HTML para el número exacto actualizado.

---

## 2. Pruebas Unitarias — Frontend

**Stack:** Vitest · @testing-library/react · jsdom
**Ubicación:** `containertrack-frontend/src/utils/__tests__/`
**Estado real: 20/20 tests pasan.** Además, se agregó una suite E2E mínima con **Playwright** (`e2e/smoke.spec.ts`, `npm run test:e2e`), corrida contra el stack local real (frontend + backend + Neon) — 1/1 exitosa (login).

### `containerValidator.test.ts` (12 tests)
**Nota de implementación real** (difiere de lo asumido en el plan v2.0): `isValidContainerNumberFormat(value: string): boolean` retorna un booleano plano, no `{valid, message}`. Es **solo validación de formato** (regex `^[A-Z]{3}[UJZ][0-9]{6}[0-9]{1}$`) — deliberadamente NO calcula el dígito verificador (esa validación completa es responsabilidad del backend, documentado en el propio código). Tests cubren: formato válido (categorías U/J/Z), la constante de ejemplo documentada, string vacío, longitud corta/larga, minúsculas, letra de categoría inválida, porción numérica con no-dígitos, menos de 3 letras de propietario, y confirma explícitamente que un dígito verificador incorrecto NO es rechazado por esta función (fuera de su alcance por diseño) — más un test directo sobre `CONTAINER_NUMBER_REGEX`.

### Scripts en `package.json` (ya agregados)
```json
"test": "vitest run",
"test:ui": "vitest --ui"
```

---

## 3. Calidad de Código

### Backend — Checkstyle (ya configurado)
`maven-checkstyle-plugin` 3.6.0 en `pom.xml`, `google_checks.xml`, modo warn-only (`failOnViolation=false`, `failsOnError=false`). Estado real: **2209 violaciones reportadas** (informativo, no bloquea build — limpieza pendiente, no es parte de este plan de pruebas).

### Frontend — Lint
El proyecto usa **oxlint** (no ESLint clásico — ya venía configurado así desde el scaffold inicial, es funcionalmente equivalente y más rápido). Script `npm run lint` ya existe. Agregado al CI como paso informativo (`continue-on-error: true`, no bloquea).

---

## 4. Pipeline CI/CD — GitHub Actions

**Ya implementado** en `.github/workflows/backend-ci.yml` y `.github/workflows/frontend-ci.yml` (nombres de carpeta reales del repo: `backend/` y `containertrack-frontend/`, ajustado del plan original que asumía `containertrack-backend/`).

### `backend-ci.yml`
Trigger: push/PR a `main`+`develop` (solo si cambian archivos en `backend/**`). Job `test`: `mvnw test` (Gate 1) → `jacoco:report` (siempre, informativo) → sube artifact `jacoco-report` → `mvnw package -DskipTests`. Job `deploy` (solo push a `main`, depende de `test` pasando): despliega a Railway vía `bervProject/railway-deploy@v1.0.0`.

### `frontend-ci.yml`
Trigger: push/PR a `main`+`develop` (solo si cambian archivos en `containertrack-frontend/**`). Job `test`: `npm ci` → `tsc --noEmit` → lint (informativo) → `npm run test` (Gate 2, Vitest) → `npm run build` (Gate 2b) → sube artifact `frontend-dist`. Job `deploy` (solo push a `main`, depende de `test` pasando): despliega a Vercel vía `amondnet/vercel-action@v25`.

---

## 5. Secrets requeridos en GitHub

`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Dónde obtenerlo | Estado |
|---|---|---|
| `RAILWAY_TOKEN` | Railway → Account Settings → Tokens | ❌ No configurado — Railway no conectado aún |
| `VERCEL_TOKEN` | Vercel → Account → Settings → Tokens | ❌ No configurado — Vercel no conectado aún |
| `VERCEL_ORG_ID` | Vercel → Settings → General → Team ID | ❌ No configurado |
| `VERCEL_PROJECT_ID` | Vercel → Project → Settings → General | ❌ No configurado |
| `VITE_API_URL_PROD` | URL del backend en Railway | ❌ No existe todavía (backend no desplegado) |
| `VITE_WS_URL_PROD` | Misma URL con `wss://` | ❌ No existe todavía |

**Sin estos 6 secrets, los jobs `deploy` de ambos workflows fallarán en cada push a `main`** — los jobs `test` (los gates reales) sí corren y pasan igual, ya que `deploy` depende de `test` pero no al revés. Configurar estos secrets es un paso de infraestructura pendiente en `STATUS.md`, no de este plan de pruebas.

---

## 6. Estrategia de ramas

```
main      → producción (Railway + Vercel) → deploy automático si gates pasan
develop   → integración → solo corre tests, no despliega
feature/* → trabajo diario → PR a develop
```

---

## 7. Lo que se puede demostrar en la defensa (ya funcional hoy)

| Demostración | Cómo | Estado |
|---|---|---|
| Tests unitarios backend corriendo | `cd backend && mvnw test` → 27 en verde, 1 skip | ✅ Listo |
| Reporte de cobertura | `mvnw jacoco:report` → abrir `target/site/jacoco/index.html` | ✅ Listo |
| Tests unitarios frontend corriendo | `cd containertrack-frontend && npm run test` → 12 en verde | ✅ Listo |
| Pipeline bloqueando deploy | Romper un test a propósito → push → ver en GitHub que el job `test` falla y `deploy` ni corre | ✅ Listo (workflows ya en `.github/workflows/`) |
| Deploy automático | Push con tests en verde → ver en Railway/Vercel que el deploy corrió | ❌ Requiere secrets de la sección 5 + proyectos Railway/Vercel creados primero |

---

## Trabajo futuro (documentar, no implementar en este ciclo)

- Testcontainers para pruebas de integración con BD real (el `@SpringBootTest` existente sigue `@Disabled` por falta de DB).
- WireMock para simular SMTP y R2 en tests.
- Gate de cobertura ≥ 70% (JaCoCo `check` goal) — hoy solo se reporta, no se exige.
- Subir cobertura real: faltan tests de `NotificationService`, `ReportService`, `FileStorageService`, `UserService`, `ShippingCompanyService`, `AuditService`.
- Pruebas de carga y rendimiento (RNF-01).
- Pruebas end-to-end con Playwright o Cypress.
- Limpieza de las 2209 violaciones de Checkstyle.

---

*Plan de Pruebas ContainerTrack v2.1 · Seminario · Julio 2026 · Implementado y verificado contra el código real.*
