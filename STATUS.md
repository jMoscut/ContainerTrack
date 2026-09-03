# ContainerTrack — Estado del Proyecto

**Última actualización:** 2026-08-20 (v3 — sistema corriendo local contra Neon real + cierre de pendientes funcionales)

---

## ✅ Hecho

### Fase 0-10 — Build completo
Backend (Spring Boot 4.0.7 / Java 17) y frontend (React 19 / TypeScript / Tailwind v4) completos, todos los módulos del alcance original implementados: auth JWT, usuarios, navieras, puertos (catálogo agregado), contenedores + ciclo de vida + ISO 6346, WebSocket tiempo real, notificaciones por correo, fotos + descarga, reportes PDF, dashboard por rol, calendario. Detalle completo por caso de uso en `DERCAS_TECNICO.md`.

### Sistema corriendo en local contra infraestructura real
- **Neon Postgres real** conectado, 10 migraciones Flyway aplicadas (`V1`–`V10`, incluye tabla `ports` agregada post-build).
- **MinIO local** (binario standalone, sin Docker) como reemplazo de Cloudflare R2 — mismo API S3, cero cambios de código.
- **Mailpit local** (binario standalone) como interceptor SMTP — correos visibles en `http://localhost:8025` sin cuenta real.
- Backend verificado arrancando (`Started ContainertrackApplication`), `/actuator/health` → `UP`, login real probado, migraciones corriendo sin error.
- Frontend verificado corriendo (`npm run dev`, `localhost:5173`) contra el backend real.

### Bugs reales encontrados y corregidos en vivo (no se ven en tests unitarios)
- Recarga de página forzaba re-login pese a tener sesión válida (faltaba usar `/api/auth/me` para restaurar perfil).
- Pantalla en blanco sin mensaje ante cualquier error de render (sin `ErrorBoundary`) — agregado.
- Dropdown de navieras roto tras paginar `/api/shipping-companies` sin actualizar el frontend (`companies?.map is not a function`).
- Dropdown de "operador responsable" vacío para roles no-ADMIN (`GET /api/users` es admin-only) — agregado `/api/users/active`, abierto a cualquier rol autenticado.
- Calendario posicionaba eventos según el timezone del navegador, no Guatemala fija — corregido con `date-fns-tz` + `getNow` override en todo el calendario, inputs de fecha, y dashboard.
- Bash `source .env.local` rompía por `&` sin comillas en `DATABASE_URL` — script de arranque reescrito para parsear línea por línea sin `eval`.

### Calidad de código
- `maven-checkstyle-plugin` (Google Java Style Guide), modo warn-only — 2209 violaciones detectadas, no bloqueantes.
- `jacoco-maven-plugin` instalado, reporte de cobertura generado en cada build.
- Vitest + Testing Library (frontend), Playwright (E2E, smoke test).

### Pendientes funcionales ya cerrados en esta ronda
- `DELETE /api/containers/{id}` (ADMIN, solo estado `REGISTERED`).
- IP real capturada y persistida en `audit_log` (antes la columna existía pero nunca se llenaba).
- Reactivar usuario ahora regenera contraseña temporal + correo de reactivación (antes solo cambiaba el estado).
- `GET /api/dashboard/admin-summary` — métricas de usuarios/navieras/puertos activos + top 5 usuarios más activos (30 días).
- Canal WebSocket `/topic/dashboard` — dashboard se actualiza en vivo ante creación/transición/descarga de cualquier contenedor.
- Botón eliminar contenedor en frontend (ADMIN, solo `REGISTERED`), con confirmación.
- Edición de fecha estimada directo desde el calendario (antes solo lectura).
- Suite de tests backend: **15 → 44** (43 pasan, 1 skip que requiere DB de integración dedicada).

### Verificación de build (confirmado tras esta ronda)
- Backend: `mvnw -q -DskipTests compile` → OK. `mvnw test` → **44 tests, 43 pasan, 1 skip**.
- Frontend: `npx tsc --noEmit` → limpio. `npm run test` → **20/20**. `npm run build` → OK, sin warnings de bundle. `npx playwright test` → 1/1 (smoke test de login).

### Medición real de rendimiento (parcial, contra Neon real)
- `GET /actuator/health` (round-trip real a Neon): **336 ms**.
- `POST /api/auth/login` (incluye hash BCrypt cost 12): **655 ms**.
- Ambos dentro del umbral <1s del RNF-01 para operaciones simples. Falta medir endpoints con datos reales (listados, generación de PDF) — requiere credenciales admin vigentes o carga de datos de prueba.

---

## ❌ Falta / Pendiente

### Bloqueante — infraestructura real que depende de tus cuentas
- [ ] **Cloudflare R2 real** (bucket + credenciales) — hoy corre contra MinIO local, nunca se probó contra R2 real.
- [ ] **SMTP real** (Gmail/SendGrid) — hoy corre contra Mailpit local, ningún correo real enviado.
- [ ] **Deploy a Railway** (backend) — solo existe la configuración (`Dockerfile`, `railway.toml`), nunca se hizo push.
- [ ] **Deploy a Vercel** (frontend) — solo existe `vercel.json`, nunca se hizo push.
- [ ] 6 *secrets* de GitHub Actions (`RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_API_URL_PROD`, `VITE_WS_URL_PROD`) — sin esto el job `deploy` del CI falla aunque los tests pasen.
- [ ] Backups automáticos de Neon (RNF-06) — configuración de Neon en sí, no código.

### Funcionalidad no implementada (decisiones documentadas en `DERCAS_TECNICO.md`)
- [ ] Eliminar fotografía de evidencia — **decisión intencional de no implementar**, contradice regla de inmutabilidad del DERCAS Visión original (RN-DESC-04); existe "invalidar" (ADMIN) como alternativa.
- [ ] Validación MIME de HEIC solo por `Content-Type` declarado, no *magic bytes* (limitación técnica documentada, sin firma binaria simple confiable para HEIC).

### Calidad / pruebas
- [ ] Cobertura de tests backend aún lejos del 70% (RNF-04) — faltan `ReportService` y `FileStorageService` sin pruebas dedicadas.
- [ ] Tests de integración (`@SpringBootTest`) deshabilitados — requiere base de datos de prueba dedicada (Testcontainers necesitaría Docker, no disponible en este entorno).
- [ ] Pruebas de carga/rendimiento formales (RNF-01: <10s PDF, <2s calendario) — solo hay mediciones puntuales manuales, no una suite de carga.
- [ ] Suite E2E ampliada — hoy solo 1 smoke test de login (Playwright); falta flujo completo crear→transicionar→descargar→reportar.
- [ ] Verificación cross-browser (Chrome/Firefox/Safari/Edge) y en dispositivos físicos reales (375px–1920px, RNF-05).
- [ ] 2209 violaciones de Checkstyle sin limpiar (cosmético, no bloqueante).

### No iniciado
- [ ] Dominio propio / DNS.
- [ ] Carga de datos reales (navieras, usuarios, puertos de la empresa cliente — hoy solo hay 18 puertos semilla).
- [ ] Ajustar CORS/CSP al dominio real de producción (no se puede fijar sin saber el dominio final de Vercel/Railway).

---

## Próximo paso recomendado
1. Probar manualmente el flujo completo en `localhost:5173`: crear naviera/puerto → crear contenedor → transicionar estados → subir foto → descargar → generar PDF → revisar el correo en Mailpit (`localhost:8025`) y la foto en MinIO (`localhost:9001`).
2. Configurar R2 y SMTP reales cuando estén disponibles, repetir esas dos pruebas específicas.
3. Deploy a Railway/Vercel + configurar los 6 secrets de GitHub Actions.
4. (Paralelo, no bloqueante) Escribir tests para `ReportService`/`FileStorageService`, ampliar suite E2E.
