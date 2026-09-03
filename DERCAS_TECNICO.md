# UNIVERSIDAD MARIANO GÁLVEZ DE GUATEMALA
## FACULTAD DE INGENIERÍA EN SISTEMAS Y CIENCIAS DE LA COMPUTACIÓN

# CONTAINER TRACK
### Sistema de Gestión y Monitoreo de Contenedores

# DERCAS TÉCNICO
**Proyecto Final — Seminario de Sistemas**

Jackeline Nikole Sanchez Moscut
Carné: 7590-22-332

Guatemala, agosto de 2026
*(Versión 2 — actualizada y verificada contra la implementación real del sistema)*

---

## Índice

1. [Introducción](#1-introducción)
   1. [Alcance](#11-alcance)
2. [Diseño General del Desarrollo](#2-diseño-general-del-desarrollo)
   1. [Casos de Uso](#21-casos-de-uso)
   2. [Diseño de Base de Datos](#22-diseño-de-base-de-datos)
   3. [Diseño de Elementos](#23-diseño-de-elementos)
3. [Procesos](#3-procesos)
4. [Arquitectura](#4-arquitectura)
5. [Set de Pruebas](#5-set-de-pruebas)
6. [Guía de Instalación](#6-guía-de-instalación)
7. [Referencias](#7-referencias)

---

## Nota metodológica de esta versión

Este documento es una actualización del DERCAS Técnico original. Durante la implementación real del sistema —realizada con asistencia de Claude Code sobre la especificación del DERCAS Visión— se identificaron divergencias puntuales entre el diseño inicial y lo que resultó más correcto, seguro o viable de construir. Cada divergencia relevante se señala explícitamente en el texto con la etiqueta **[Divergencia de diseño]**, y cada funcionalidad especificada pero no implementada aún se señala con **[Pendiente]**. Esto es intencional: el documento debe ser fiel al sistema que existe, no una aspiración.

---

## 1. Introducción

El análisis, diseño y desarrollo del sistema ContainerTrack comprende varias etapas metodológicas. Para el presente proyecto se utilizó una metodología estructurada que inició con la toma de requerimientos, documentada en el DERCAS Visión, donde se detalló cada uno de los casos de uso identificados. Posteriormente, se procedió con el diseño de interfaces, el modelo de datos relacional, la arquitectura del sistema y la definición del plan de pruebas, garantizando la documentación integral de cada etapa del ciclo de vida del software.

ContainerTrack responde a una necesidad real del sector logístico guatemalteco: centralizar la gestión y monitoreo del ciclo de vida completo de contenedores de importación, desde su salida del puerto de origen hasta la finalización de la descarga en bodega. El presente documento DERCAS Técnico consolida el diseño técnico del sistema **tal como fue efectivamente implementado**, incluyendo los casos de uso formales, el modelo de base de datos, las pantallas, los reportes, los procesos internos, la arquitectura de despliegue y la guía de instalación local verificada.

### 1.1. Alcance

El desarrollo del proyecto ContainerTrack contempla los siguientes módulos funcionales:

- Módulo de autenticación y control de acceso basado en roles (`ADMIN`, `OPERATOR`, `WAREHOUSE`) con JWT y BCrypt.
- Módulo de gestión de usuarios: creación, activación, edición y desactivación con correo de activación automático.
- Módulo de gestión de navieras: registro, edición y desactivación de compañías navieras.
- Módulo de gestión de puertos **[Divergencia de diseño — módulo agregado post-implementación]**: catálogo de puertos de origen/destino seleccionables mediante *dropdown*, no contemplado en el DERCAS Visión original; se agregó porque el registro de contenedores en texto libre generaba inconsistencias de captura.
- Módulo de registro y gestión de contenedores: ciclo de vida completo con validación ISO 6346 (dígito verificador incluido) y máquina de estados secuencial.
- Módulo de calendario compartido: visualización de fechas clave con filtros por naviera, estado y rango de fechas.
- Módulo de registro de descarga y evidencia fotográfica: carga a almacenamiento compatible con S3 (Cloudflare R2 en producción) con URLs firmadas temporales.
- Módulo de notificaciones por correo electrónico: alertas automáticas para fechas críticas de arribo y descarga.
- Módulo de reportes en PDF: individuales por contenedor y consolidados filtrables por naviera y rango de fechas.
- Panel de control (*dashboard*): indicadores de estado, contenedores críticos y feed de actividad reciente, adaptado por rol.

La implementación técnica utiliza **Spring Boot 4.0.7** en el backend con **Java 17**, **React 19** con **TypeScript** y **Tailwind CSS v4** en el frontend, **PostgreSQL serverless (Neon)** como base de datos, **Cloudflare R2** para almacenamiento de fotografías y **Railway/Vercel** para el despliegue en la nube.

**[Divergencia de diseño]** El DERCAS Visión original especificaba Spring Boot 3.x; para la fecha de implementación (2026), Spring Boot 3 ya no estaba disponible en los repositorios de Maven Central (el proyecto Spring Boot avanzó a la rama 4.x), por lo que se utilizó Spring Boot 4.0.7 sin que esto afectara ningún requerimiento funcional.

---

## 2. Diseño General del Desarrollo

### 2.1. Casos de Uso

Cada caso de uso se documenta con su estado real de implementación. Los estados posibles son: **Implementado**, **Implementado con divergencias**, y **Pendiente**.

#### CU-01 — Autenticación y Control de Acceso

**Estado: Implementado con divergencias.**

Módulo encargado de verificar las credenciales de los usuarios del sistema ContainerTrack y controlar el acceso a las funcionalidades según el rol asignado (`ADMIN`, `OPERATOR`, `WAREHOUSE`). Implementa autenticación mediante JWT con expiración de 8 horas, bloqueo temporal tras intentos fallidos consecutivos y cambio obligatorio de contraseña temporal en el primer acceso.

**Secuencia normal (implementada):**
1. El sistema presenta el formulario de inicio de sesión (correo y contraseña).
2. El usuario ingresa sus credenciales.
3. El sistema valida el formato del correo (frontend, con Zod) y lo reenvía al backend.
4. El backend verifica la existencia del usuario por correo (`UserRepository.findByEmail`).
5. El backend valida que `locked_until` no esté en el futuro (bloqueo activo se revisa **antes** que la contraseña).
6. El backend verifica la contraseña contra el hash BCrypt (cost factor 12).
7. El backend valida que el estado sea `ACTIVE` o `PENDING_ACTIVATION`; `INACTIVE` es rechazado.
8. El sistema emite un JWT de acceso (8 horas) y un *refresh token* opaco (7 días).
9. Si el usuario tiene `mustChangePassword = true`, todas las rutas salvo `/api/auth/change-password` y `/api/auth/logout` quedan bloqueadas (`403 PASSWORD_CHANGE_REQUIRED`) hasta completar el cambio.
10. El sistema redirige al dashboard correspondiente al rol.

**Excepciones implementadas:** `INVALID_CREDENTIALS` (correo/contraseña incorrectos, sin especificar cuál), `ACCOUNT_LOCKED` (con `lockedUntil` en la respuesta), `ACCOUNT_INACTIVE`, `TOKEN_EXPIRED` (401, dispara refresco automático desde el frontend).

**Flujos alternos:**
- **FA-01 Cerrar sesión:** invalida el *refresh token* en base de datos (`POST /api/auth/logout`).
- **FA-02 Renovación de token:** `POST /api/auth/refresh`, valida vigencia de 7 días, emite nuevo *access token*.
- **FA-03 Cambio de contraseña obligatorio:** `POST /api/auth/change-password`, política: mínimo 8 caracteres, mayúscula, dígito y carácter especial.
- **FA-04 Recuperación de perfil de sesión:** `GET /api/auth/me` — **agregado durante la fase de estabilización**, restaura el perfil del usuario autenticado sin reenviar credenciales, corrigiendo un defecto donde recargar la página (F5) forzaba un nuevo login pese a tener un *refresh token* válido.

**[Divergencia de diseño]** El *refresh token* se retorna en el cuerpo de la respuesta JSON, **no** en una cookie `httpOnly` como especificaba el DERCAS Visión original. El frontend lo mantiene en memoria (estado de React) y lo espeja en `sessionStorage` únicamente para sobrevivir una recarga de página, nunca en `localStorage`. Se documentó esta decisión como una alternativa razonable dado que el proyecto no dispone de infraestructura de cookies entre dominios distintos (frontend en Vercel, backend en Railway) sin configuración CORS/SameSite adicional; queda como mejora futura migrar a cookie `httpOnly` + `SameSite=Strict`.

**Registro de dirección IP (PC3):** implementado. `AuditService` extrae la IP del cliente de la cabecera `X-Forwarded-For` (primer salto) con respaldo en `getRemoteAddr()`, y la persiste en `audit_log.ip_address` en cada registro de auditoría generado durante una petición HTTP real.

---

#### CU-02 — Gestión de Usuarios

**Estado: Implementado.**

Módulo que permite al Administrador crear, editar, activar y desactivar usuarios. Al crear un usuario, el sistema genera una contraseña temporal de 12 caracteres y envía un correo de activación (plantilla Thymeleaf) válido por 48 horas. El correo electrónico es inmutable una vez creado.

**Endpoints implementados** (todos `@PreAuthorize("hasRole('ADMIN')")` salvo el indicado):
- `GET /api/users` — listado paginado.
- `GET /api/users/active` — **agregado durante la fase de correcciones**, abierto a cualquier rol autenticado; retorna usuarios activos en formato liviano (`id`, `fullName`, `role`) para poblar selectores como "operador responsable" sin exponer el listado administrativo completo.
- `POST /api/users` — creación con contraseña temporal + correo de activación (*best-effort*: si el envío falla, el usuario igual se crea, y el error se registra en log).
- `PATCH /api/users/{id}` — edita nombre y rol; el correo es de solo lectura.
- `PATCH /api/users/{id}/status` — activar/desactivar; al desactivar se invalida el *refresh token* almacenado (equivalente a cerrar sesión).
- `POST /api/users/{id}/resend-activation` — reenvío de credenciales.

Toda mutación queda registrada en `audit_log` con valores anterior/nuevo por campo.

**Regla de negocio aplicada:** el sistema exige al menos un usuario `ADMIN` activo en todo momento; no permite desactivar al último administrador activo.

**FA-03 Reactivar usuario:** implementado. `PATCH /api/users/{id}/status` detecta específicamente la transición `INACTIVE → ACTIVE`, genera una nueva contraseña temporal, fuerza `must_change_password=true` y envía un correo de reactivación (plantilla `reactivation.html`), dejando el estado final en `ACTIVE` con cambio de contraseña obligatorio en el siguiente inicio de sesión.

---

#### CU-03 — Gestión de Navieras

**Estado: Implementado.**

Módulo que permite a `ADMIN` y `OPERATOR` consultar el catálogo de navieras; la creación, edición y cambio de estado están restringidos a `ADMIN`.

**Endpoints:** `GET /api/shipping-companies` (paginado, `ADMIN`+`OPERATOR`), `POST`, `PATCH /{id}`, `PATCH /{id}/status` (los tres, solo `ADMIN`).

**Campos:** nombre, código corto (único), país, correo de contacto, teléfono de contacto, notas, `freeDaysLimit` (días libres por defecto de la naviera, usado al calcular el vencimiento de *free days* en la transición a `ARRIVED_PORT`).

**Pantalla dedicada:** `/navieras` (solo `ADMIN`) — **agregada durante la ronda de corrección de brechas**, ya que la especificación original delegaba la gestión de navieras únicamente al *dropdown* del formulario de contenedor, sin una pantalla de administración explícita; se detectó que sin esta pantalla no existía forma de dar de alta una naviera desde la interfaz.

Una naviera desactivada no puede asignarse a nuevos contenedores (validado en `ContainerService.create`), pero permanece en el historial de contenedores existentes.

---

#### CU-04 — Registro y Gestión de Contenedores

**Estado: Implementado con divergencias.**

Módulo principal del sistema. Permite registrar contenedores con número validado contra el estándar ISO 6346 (incluyendo dígito verificador) y gestionar su ciclo de vida mediante una máquina de estados secuencial.

**Máquina de estados real implementada:**

```
REGISTERED → DEPARTED_ORIGIN → ARRIVED_PORT → DEPARTED_PORT → ARRIVED_WAREHOUSE → DISCHARGED
```

**[Divergencia de diseño]** El presente DERCAS Técnico (versión previa a esta actualización) documentaba los estados como `REGISTERED → DEPARTED_ORIGIN → IN_TRANSIT → ARRIVED_PORT → IN_TRANSIT_WAREHOUSE → ARRIVED_WAREHOUSE → DISCHARGED` (7 estados). La implementación real —heredada del DERCAS Visión original, que es la fuente de verdad usada para construir el sistema— utiliza 6 estados, sin los estados intermedios `IN_TRANSIT`/`IN_TRANSIT_WAREHOUSE`, ya que "en tránsito" se representa implícitamente como el período entre dos transiciones confirmadas, no como un estado propio. Se corrige aquí la numeración de estados para reflejar el sistema real.

**Validador ISO 6346:** clase `ContainerNumberValidator`, implementa el algoritmo de dígito verificador completo (valores alfanuméricos ponderados por 2^posición, módulo 11, módulo 10), verificado con el ejemplo canónico del estándar (`CSQU3054383`) y con prefijos reales de navieras (MSC, Maersk, Triton, Hapag-Lloyd). Se corrigió un ejemplo erróneo del DERCAS Visión original (`MSCU1234565`, cuyo dígito verificador correcto es 6, no 5) tras verificarlo matemáticamente contra el algoritmo del estándar.

**Endpoints implementados:**
- `GET /api/containers` — paginado, filtros por estado, naviera, rango de fechas, operador. El rol `WAREHOUSE` solo ve contenedores en `ARRIVED_WAREHOUSE` o `DISCHARGED`.
- `GET /api/containers/{id}` — detalle completo.
- `POST /api/containers` — valida ISO 6346, unicidad entre contenedores activos (índice único parcial `WHERE status <> 'DISCHARGED'`), naviera activa, fecha estimada de salida no pasada.
- `PATCH /api/containers/{id}` — edición parcial de campos descriptivos y fechas, con *locking* optimista (`@Version`); conflicto de edición concurrente → `409 EDIT_CONFLICT`. Bloqueado por completo si el contenedor está `DISCHARGED`.
- `POST /api/containers/{id}/transition` — transición de estado, valida secuencia estricta, calcula `free_days_expiry` (días hábiles) al llegar a `ARRIVED_PORT`, activa `delay_flag` si la diferencia entre fecha real y estimada de arribo supera 48 horas.
- `GET /api/containers/{id}/history` — historial de cambios de campo y de estado.

Cada edición de campo se registra en `container_field_changes` (valor anterior, valor nuevo, usuario, fecha) y cada transición de estado se registra en `audit_log` con acción `STATUS_CHANGE`.

**FA-05 Eliminar contenedor:** implementado. `DELETE /api/containers/{id}` (solo `ADMIN`), permitido únicamente cuando `status == REGISTERED` (`409 CANNOT_DELETE_CONTAINER` en cualquier otro estado). Es una eliminación física real (única excepción al principio de "nada se borra" del resto del sistema), justificada porque está estrictamente acotada a contenedores que nunca tuvieron actividad de ciclo de vida; se escribe un registro `audit_log` con `action=DELETE` en la misma transacción antes del borrado, preservando trazabilidad de que la eliminación ocurrió y quién la hizo, aunque el registro del contenedor en sí ya no exista.

**Origen y destino como catálogo [Divergencia de diseño — mejora agregada]:** el formulario de registro originalmente capturaba puerto de origen y destino como texto libre. Se detectó que esto generaba inconsistencias de captura (mismo puerto escrito de formas distintas). Se agregó un catálogo de puertos (`ports`, ver sección 2.2) y ambos campos ahora son *dropdowns*: el de destino se filtra a puertos marcados como guatemaltecos (regla de negocio: el destino debe ser un puerto de Guatemala), el de origen muestra el catálogo completo. El valor seleccionado se sigue almacenando como texto libre en `containers.origin_port`/`destination_port` (no hay clave foránea), por lo que la migración es puramente de experiencia de usuario, sin cambio de esquema en `containers`.

---

#### CU-05 — Calendario Compartido

**Estado: Implementado con divergencias.**

Calendario interactivo (`react-big-calendar`) con eventos derivados de las fechas clave de los contenedores. Filtros por naviera, estado y rango de fechas. Distingue visualmente fechas estimadas (borde punteado) de fechas reales confirmadas (borde sólido), con colores por estado.

**[Divergencia de diseño]** El calendario originalmente se construía con `new Date()` crudo, lo que hacía que la posición y hora de los eventos dependiera de la zona horaria del navegador del usuario en lugar de la hora de Guatemala fija. Se corrigió forzando la conversión a `America/Guatemala` (UTC-6, sin horario de verano) mediante `date-fns-tz`, tanto para el posicionamiento de eventos como para el indicador de "ahora" del calendario.

**FA-01 Editar fecha desde el calendario:** implementado. Al hacer clic en un evento de fecha **estimada** (no en fechas reales/confirmadas) sobre un contenedor no `DISCHARGED`, y si el usuario tiene permiso de edición, el panel lateral muestra un botón "Editar fecha" que abre un modal de un solo campo, reutilizando exactamente el mismo mecanismo de *locking* optimista (`version`) y manejo de conflicto `409 EDIT_CONFLICT` que la edición desde el detalle del contenedor.

**Implementado correctamente:** actualización en tiempo real vía WebSocket (`STOMP /topic/container/{id}`) — al abrir el detalle de un contenedor específico, cualquier edición realizada por otro usuario se refleja sin recargar la página, con una notificación tipo *toast*.

---

#### CU-06 — Registro de Descarga y Evidencia Fotográfica

**Estado: Implementado con una divergencia intencional de seguridad.**

Permite al Supervisor de Bodega (rol `WAREHOUSE`, también accesible a `ADMIN`) registrar la finalización de la descarga adjuntando evidencia fotográfica.

**Flujo implementado:**
1. Contenedor debe estar en `ARRIVED_WAREHOUSE`.
2. `POST /api/containers/{id}/photos` — carga de 1 a 20 archivos, valida tipo real mediante *magic bytes* (firma binaria: JPEG `FFD8FF`, PNG `89504E47`, WEBP vía contenedor RIFF; HEIC se acepta por `Content-Type` declarado, limitación documentada en código dado que no existe una firma binaria simple y confiable para HEIC). Rechaza extensiones ejecutables (`.exe`, `.sh`, `.php`, etc.) independientemente del MIME reportado. Límite de 10 MB por archivo. Reintentos con *backoff* exponencial (500 ms, 1 s, 2 s) ante fallos de red hacia el almacenamiento; los archivos que fallan tras 3 intentos se omiten sin bloquear la subida del resto del lote.
3. `POST /api/containers/{id}/discharge` — exige al menos 1 fotografía ya subida (`400 PHOTOS_REQUIRED` si no hay ninguna), valida que la hora de fin sea igual o posterior a la de inicio, transiciona a `DISCHARGED` (estado final, de solo lectura desde entonces) y envía notificación de confirmación por correo.

**[Divergencia de diseño — intencional]** FA-02 del caso de uso original permite "eliminar fotografía" antes de confirmar la descarga. La implementación real **prohíbe deliberadamente el borrado de fotografías** una vez subidas: no existe endpoint `DELETE` para `container_photos`. Esto se decidió siguiendo una regla de negocio explícita del DERCAS Visión original (RN-DESC-04: *"las fotografías de evidencia no pueden eliminarse una vez subidas"*), que entra en conflicto directo con lo que pide este DERCAS Técnico. Se priorizó la regla de integridad de evidencia del documento de visión por ser la fuente de requerimientos de negocio más autorizada. Como alternativa, se implementó `PATCH /api/containers/{id}/photos/{photoId}/invalidate` (solo `ADMIN`), que marca una foto como inválida con una justificación textual, sin eliminarla físicamente ni del registro ni del almacenamiento.

---

#### CU-07 — Sistema de Notificaciones por Correo

**Estado: Implementado con divergencias en la temporización.**

Scheduler (`@Scheduled(fixedRate = 1800000)`, cada 30 minutos) que evalúa 6 reglas de notificación con idempotencia garantizada mediante `notification_log`.

**Reglas implementadas** (ventanas de tiempo reales, distintas a las descritas como "1 día antes" / "2 días antes" del documento original — se usan ventanas horarias más precisas para evitar reenvíos ambiguos dentro del mismo día):

| Regla | Condición real implementada | Destinatarios |
|---|---|---|
| Arribo a puerto (48h) | `estimated_arrival_port` entre `now+24h` y `now+48h` | Operador responsable + administradores |
| Arribo a puerto (24h) | `estimated_arrival_port` entre `now` y `now+24h` | Operador responsable + administradores |
| Vencimiento *free days* (72h) | `free_days_expiry` entre `now+48h` y `now+72h` | Operador responsable + administradores |
| Vencimiento *free days* (24h) | `free_days_expiry` entre `now` y `now+24h` | **Todos** los usuarios activos (alerta crítica) |
| Arribo a bodega (2h) | `estimated_arrival_warehouse` entre `now+1h` y `now+2h` | Usuarios `WAREHOUSE` + operador |
| Arribo a bodega (1h) | `estimated_arrival_warehouse` entre `now` y `now+1h` | Usuarios `WAREHOUSE` + operador |

Adicionalmente, se envía confirmación de descarga (al completar `POST /discharge`) y confirmación de edición de contenedor (al editor, tras cada `PATCH` exitoso) — ambas fuera de la tabla anterior porque son eventos disparados por acción de usuario, no por el scheduler periódico.

Cada combinación (contenedor, tipo de notificación, destinatario) se verifica contra `notification_log` antes de enviar; reintentos hasta 3 veces con incremento de `retry_count`, y marca `FAILED` si se agotan.

**Plantillas de correo:** Thymeleaf, estilo con la paleta de marca (fondo `#FDFDD0`, encabezado `#004F2E`, botón de acción `#D4AF37`).

**[Divergencia de diseño]** El envío real de correos nunca se ha probado contra un proveedor SMTP en producción (Gmail/SendGrid); en el entorno de desarrollo local se utiliza **Mailpit** (interceptor SMTP local) para verificar visualmente el contenido de los correos sin necesidad de credenciales reales. Ver sección 6.

---

#### CU-08 — Reportes en PDF

**Estado: Implementado.**

Generación de reportes con iText7, sin almacenamiento en disco (generación bajo demanda, `byte[]` en memoria).

**Endpoints:**
- `GET /api/reports/container/{id}` (`ADMIN`/`OPERATOR`) — reporte individual: datos del contenedor, línea de tiempo completa (fecha estimada vs. real por etapa, diferencia en días, fila resaltada en rojo claro si `delay_flag`), evidencia fotográfica embebida (URLs firmadas de 15 minutos, descargadas en memoria para insertarlas en el PDF), historial de ediciones (campo, valor anterior, valor nuevo, usuario, fecha).
- `POST /api/reports/consolidated` (`ADMIN`/`OPERATOR`) — filtros por naviera, estado, operador y rango de fechas; tope de 500 registros (`400 TOO_MANY_RESULTS` si se excede, solicitando acotar el rango — no se trunca silenciosamente); tabla resumen + estadísticas (total, promedio de días por etapa, porcentaje con retraso, top 3 navieras con más incidencias).

**[Pendiente de verificación]** El tiempo de generación (< 10 segundos, RNF-01) nunca se ha medido contra un PDF real, ya que no se ha generado ninguno fuera de pruebas unitarias, al no existir aún datos de producción ni conexión R2 real.

---

#### CU-09 — Panel de Control (Dashboard)

**Estado: Implementado con una divergencia (actualización en tiempo real).**

Dashboard adaptado por rol:

- **`ADMIN`/`OPERATOR`:** contadores por estado, contenedores con *free days* venciendo en los próximos 5 días (resaltados), contenedores con `delay_flag` activo, últimas 10 actualizaciones (obtenidas ordenando el listado de contenedores por `lastUpdatedAt` descendente, no mediante un *endpoint* de feed dedicado), gráfico de barras de contenedores por naviera (construido con SVG/CSS propio, sin librería adicional de gráficos).
- **`WAREHOUSE`:** solo contenedores pendientes de descarga (`ARRIVED_WAREHOUSE`) y descargas completadas en los últimos 7 días.

Las comparaciones de fecha del dashboard (vencimientos, "últimos 7 días") se corrigieron para usar la hora de Guatemala fija en lugar de la hora local del navegador, evitando que un usuario en otra zona horaria vea un conjunto de contenedores distinto al esperado.

**FA-02 Dashboard por rol ADMIN — métricas adicionales:** implementado. `GET /api/dashboard/admin-summary` (solo `ADMIN`) retorna conteo de usuarios activos, navieras activas y puertos activos, más un top 5 de "usuarios más activos" (por cantidad de entradas en `audit_log` en los últimos 30 días), mostrado en una sección exclusiva del dashboard cuando el rol es `ADMIN`.

**Actualización en tiempo real del dashboard:** implementado. Se agregó el canal `STOMP /topic/dashboard` (además del canal por contenedor ya existente), publicado en creación, transición de estado y descarga de cualquier contenedor. El dashboard se suscribe y refresca sus consultas de React Query automáticamente ante cada evento, con una notificación *toast* discreta solo para descargas confirmadas (para no saturar con avisos en cada cambio menor).

---

### 2.2. Diseño de Base de Datos

El modelo de datos de ContainerTrack está construido sobre **PostgreSQL serverless (Neon)** y gestionado mediante migraciones **Flyway (V1 a V10)**.

**[Divergencia de diseño general]** El DERCAS Técnico original especificaba llaves primarias `UUID` para todas las tablas. La implementación real utiliza `BIGSERIAL` (enteros autoincrementales) como llave primaria en todas las tablas. Se optó por este enfoque por simplicidad de depuración, rendimiento de índices B-tree y porque ningún requerimiento del sistema exige identificadores no secuenciales ni generación distribuida de IDs.

| Migración | Tabla | Descripción |
|---|---|---|
| V1 | `users` | Usuarios, credenciales, rol, estado, control de bloqueo. |
| V2 | `shipping_companies` | Navieras: nombre, código corto, país, contacto, `free_days_limit`, estado. |
| V3 | `containers` | Tabla central: número ISO 6346, naviera, estado, fechas clave, `free_days_limit`/`free_days_expiry`, `delay_flag`, `version` (locking optimista). |
| V4 | `container_photos` | Evidencia fotográfica: clave de almacenamiento (R2/S3), tipo MIME, tamaño, validez. |
| V5 | `audit_log` | Auditoría inmutable de todas las acciones del sistema. |
| V6 | `notification_log` | Registro de notificaciones enviadas, con idempotencia. |
| V7 | `container_field_changes` | Historial granular de cambios de campo por contenedor. |
| V8 | — | Índices de rendimiento (número de contenedor, estado, naviera, fechas, auditoría, notificaciones). |
| V9 | — | Usuario administrador por defecto (`admin@containertrack.gt`, `PENDING_ACTIVATION`). |
| V10 | `ports` | **[Agregado post-implementación]** Catálogo de puertos (nombre, país, indicador de puerto guatemalteco, estado), con 18 puertos semilla. |

#### Descripción de columnas principales — Tabla `containers`

| Columna | Tipo real | Descripción |
|---|---|---|
| `id` | `BIGSERIAL` | Identificador único del contenedor (PK). *(El diseño original especificaba `UUID`; ver divergencia general arriba.)* |
| `container_number` | `VARCHAR(11)` | Número ISO 6346 validado con dígito verificador. |
| `shipping_company_id` | `BIGINT` FK | Referencia a la naviera asignada. |
| `origin_port` / `destination_port` | `VARCHAR(255)` | Texto libre, poblado desde el catálogo de puertos vía *dropdown* en el frontend (sin FK). |
| `responsible_operator_id` | `BIGINT` FK | Usuario responsable (cualquier rol activo, no solo `OPERATOR` — ver CU-04). |
| `status` | `VARCHAR(30)` con `CHECK` | Estado actual: `REGISTERED`, `DEPARTED_ORIGIN`, `ARRIVED_PORT`, `DEPARTED_PORT`, `ARRIVED_WAREHOUSE`, `DISCHARGED`. |
| `version` | `INT` | Campo de *locking* optimista (`@Version`). Conflictos → HTTP 409. |
| `estimated_departure_date` / `actual_departure_date` | `TIMESTAMP WITH TIME ZONE` | Fechas de salida desde origen (estimada/real). |
| `estimated_arrival_port` / `actual_arrival_port` | `TIMESTAMP WITH TIME ZONE` | Fechas de arribo a puerto guatemalteco. |
| `free_days_limit` | `INT` | Días libres otorgados (por defecto heredado de la naviera, editable por contenedor). |
| `free_days_expiry` | `TIMESTAMP WITH TIME ZONE` | Calculado automáticamente al transicionar a `ARRIVED_PORT` (días hábiles desde el arribo). |
| `estimated_departure_port` / `actual_departure_port` | `TIMESTAMP WITH TIME ZONE` | Fechas de salida del puerto hacia bodega. |
| `estimated_arrival_warehouse` / `actual_arrival_warehouse` | `TIMESTAMP WITH TIME ZONE` | Fechas de llegada a bodega. |
| `discharge_start_at` / `discharge_end_at` / `discharge_notes` | — | Datos de la descarga. |
| `delay_flag` | `BOOLEAN` | Se activa si la diferencia entre arribo real y estimado supera 48 horas. |
| `last_updated_by` / `last_updated_at` | `BIGINT` FK / `TIMESTAMPTZ` | Trazabilidad de la última edición, visible en la interfaz. |
| `created_by`, `created_at`, `updated_at`, `deleted_at` | — | Auditoría estándar; `deleted_at` reservado para borrado lógico (no usado por CU-04 FA-05, que implementa borrado físico real por estar acotado a contenedores en `REGISTERED`). |

#### Descripción de columnas principales — Tabla `users`

| Columna | Tipo real | Descripción |
|---|---|---|
| `id` | `BIGSERIAL` | Identificador único (PK). |
| `email` | `VARCHAR(255)` único | Identificador de negocio, inmutable. |
| `password_hash` | `VARCHAR(255)` | BCrypt, cost factor 12. |
| `full_name` | `VARCHAR(255)` | Nombre completo. |
| `role` | `VARCHAR(20)` con `CHECK` | `ADMIN`, `OPERATOR`, `WAREHOUSE`. |
| `status` | `VARCHAR(30)` con `CHECK` | `ACTIVE`, `INACTIVE`, `PENDING_ACTIVATION`. |
| `failed_login_attempts` | `INT` | Contador de intentos fallidos consecutivos. |
| `locked_until` | `TIMESTAMPTZ` | Bloqueo temporal (15 minutos tras 5 fallos). |
| `activation_token` / `activation_token_expiry` | — | Token de activación de 48 horas. |
| `refresh_token` / `refresh_token_expiry` | — | *Refresh token* opaco de 7 días. |
| `must_change_password` | `BOOLEAN` | Fuerza el cambio de contraseña temporal en el primer acceso. |

#### Tabla `ports` **[Agregada post-implementación]**

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `BIGSERIAL` | PK. |
| `name` | `VARCHAR(255)` único | Nombre del puerto. |
| `country` | `VARCHAR(100)` | País. |
| `is_guatemalan` | `BOOLEAN` | Filtra el *dropdown* de destino (regla: destino debe ser puerto de Guatemala). |
| `is_active` | `BOOLEAN` | Disponibilidad en el catálogo. |

Todas las demás tablas (`shipping_companies`, `container_photos`, `audit_log`, `notification_log`, `container_field_changes`) se implementaron conforme a lo descrito en el DERCAS Visión original, sin divergencias relevantes.

---

### 2.3. Diseño de Elementos

#### 2.3.1. Pantallas

Implementadas en React 19 + TypeScript + Tailwind CSS v4, con la paleta de marca definida en el DERCAS Visión (verde esmeralda `#004F2E`, dorado `#D4AF37`, marfil `#FDFDD0`).

| Pantalla | Ruta | Acceso | Estado |
|---|---|---|---|
| Inicio de sesión | `/login` | Público | Implementado |
| Cambio de contraseña obligatorio | `/change-password` | Autenticado, forzado si `mustChangePassword` | Implementado |
| Panel de control | `/` | Todos los roles (contenido adaptado) | Implementado con divergencias (ver CU-09) |
| Listado de contenedores | `/containers` | Todos los roles (filtrado por rol) | Implementado |
| Detalle de contenedor | `/containers/:id` | Todos los roles | Implementado (edición inline, transición de estado, fotos, descarga, historial, tiempo real) |
| Calendario | `/calendar` | Todos los roles | Implementado con divergencias (ver CU-05) |
| Gestión de usuarios | `/users` | Solo `ADMIN` | Implementado |
| Gestión de navieras | `/navieras` | Solo `ADMIN` | Implementado **[agregado post-implementación]** |
| Gestión de puertos | `/puertos` | Solo `ADMIN` | Implementado **[agregado post-implementación]** |
| Reportes | `/reports` | `ADMIN`/`OPERATOR` | Implementado |

**Componentes base compartidos:** `Button`, `Badge` (colores por estado del contenedor), `Card`, `Modal`, `Input`, `Select`, `Textarea`, con *layout* de barra lateral fija en escritorio y menú tipo *drawer* colapsable en móvil (agregado tras detectar que la barra lateral fija rompía el diseño responsivo por debajo de 768px).

**Manejo de errores de interfaz:** se agregó un componente `ErrorBoundary` global tras detectar que un error de renderizado en cualquier pantalla dejaba la aplicación completamente en blanco sin mensaje alguno; ahora cualquier error de ese tipo se muestra en pantalla con la opción de reintentar.

#### 2.3.2. Reportes

**Reporte Individual por Contenedor** — contenido implementado:
- Encabezado con marca ContainerTrack (color `#004F2E`).
- Tabla de datos del contenedor (2 columnas).
- Línea de tiempo: etapa, fecha estimada, fecha real, diferencia en días; fila resaltada (`#FADBD8`) si `delay_flag` está activo.
- Grilla de evidencia fotográfica (2 columnas) con fecha de carga.
- Historial de ediciones: fecha, campo, valor anterior, valor nuevo, usuario.
- Pie de página con fecha de generación y usuario solicitante.

**Reporte Consolidado** — contenido implementado:
- Tabla resumen: número de contenedor, naviera, estado, fecha de registro, fecha de descarga, días en tránsito.
- Bloque de estadísticas: total de contenedores, promedio de días por etapa, porcentaje con retraso, top 3 navieras con más incidencias.
- Límite estricto de 500 registros por generación (RN-REP-02 del DERCAS Visión).

---

## 3. Procesos

Procesos internos automatizados del backend:

- **`NotificationScheduler`** — proceso programado (`@Scheduled`, cada 30 minutos) descrito en el CU-07. Se ejecuta de forma independiente del tráfico de usuarios.
- **`ContainerStateMachine`** — valida cada transición de estado antes de persistirla; centraliza la regla de "sin saltos, sin retrocesos" y el bloqueo de la transición directa a `DISCHARGED` (solo alcanzable vía el proceso dedicado de descarga).
- **Proceso de descarga (`DischargeService`)** — orquesta la validación de fotografías mínimas, la transición de estado, el registro de auditoría y el disparo de la notificación de confirmación dentro de una única transacción (`@Transactional`), garantizando que un fallo parcial revierta toda la operación.
- **Publicación de eventos WebSocket (`ContainerRealtimeNotifier`)** — tras cada edición exitosa de un contenedor, publica un evento en `/topic/container/{id}` con los campos modificados, quién los modificó y cuándo.
- **Envío de correo asíncrono (`@Async`)** — el envío de correos de confirmación de edición no bloquea la respuesta HTTP de la operación que lo origina.
- **Auditoría transaccional** — toda escritura en `audit_log` ocurre dentro de la misma transacción que la operación de negocio que la origina (RNF-07 del DERCAS Visión), de modo que un `rollback` revierte ambas.

---

## 4. Arquitectura

**Arquitectura por capas** (Controller → Service → Repository), backend Spring Boot 4.0.7 / Java 17, frontend React 19 / TypeScript servido de forma independiente.

```
┌─────────────────┐        HTTPS/WSS        ┌──────────────────────┐
│   Frontend       │ ───────────────────────▶│   Backend             │
│   React + Vite    │◀─────────────────────── │   Spring Boot 4.0.7   │
│   (Vercel)         │                         │   (Railway)            │
└─────────────────┘                         └───────────┬──────────┘
                                                          │
                       ┌──────────────────────────────────┼───────────────────────┐
                       ▼                                  ▼                       ▼
              ┌────────────────┐              ┌──────────────────┐    ┌────────────────────┐
              │ PostgreSQL       │              │ Cloudflare R2      │    │ SMTP (Gmail/         │
              │ (Neon, serverless)│              │ (fotos, S3-compat) │    │ SendGrid)              │
              └────────────────┘              └──────────────────┘    └────────────────────┘
```

**Despliegue:** `Dockerfile` multi-etapa (backend, `eclipse-temurin:21-jdk-alpine` → `21-jre-alpine`), `railway.toml`, `vercel.json` con cabeceras de seguridad (`X-Frame-Options`, `CSP`, `HSTS`). Pipeline de CI/CD con GitHub Actions: *gate* de pruebas backend (`mvn test`) y frontend (`npm run test` + `npm run build`) antes de cualquier despliegue automático a Railway/Vercel.

**[Pendiente]** El despliegue a Railway y Vercel **no se ha ejecutado** — la infraestructura de producción (proyecto Railway, proyecto Vercel, dominio, secrets de GitHub Actions) no ha sido creada. El sistema ha sido verificado únicamente en ejecución local (ver sección 6).

**Entorno local de desarrollo verificado:** base de datos Neon real (nube), y sustitutos locales sin necesidad de credenciales de terceros para R2 y SMTP:
- **MinIO** (binario *standalone* para Windows, sin Docker) como reemplazo local de Cloudflare R2, compatible con la misma API S3 que usa el backend sin cambios de código — solo variables de entorno distintas.
- **Mailpit** (binario *standalone* para Windows) como interceptor SMTP local, con interfaz web para inspeccionar visualmente cada correo generado por el sistema sin necesidad de una cuenta de correo real.

---

## 5. Set de Pruebas

**Estado real verificado** (ver `PLAN_PRUEBAS.md` en la raíz del repositorio para el detalle completo):

| Componente | Framework | Resultado |
|---|---|---|
| Backend | JUnit 5 + Mockito + AssertJ | **44 pruebas — 43 exitosas, 1 omitida** (requiere base de datos de integración dedicada, no disponible en este entorno) |
| Frontend (unitarias) | Vitest + Testing Library | **20 pruebas — 20 exitosas** |
| Frontend (E2E) | Playwright (solo Chromium) | **1 prueba de humo — exitosa** (login; ver nota abajo) |

**Cobertura backend (JaCoCo):** herramienta instalada y en modo *solo reporte* (no bloquea el *build*). Ahora con pruebas dedicadas para `ContainerStateMachine`, `AuthService`, `ContainerService`, `DischargeService`, `UserService`, `ShippingCompanyService`, `AuditService` (incluida la captura de IP) y `NotificationService` (casos de manejo de errores de envío y construcción de plantillas). Cobertura real todavía **por debajo del 70 %** exigido por el RNF-04 — `ReportService` y `FileStorageService` quedan **[Pendiente]** de pruebas unitarias dedicadas.

**Calidad de estilo (Checkstyle):** configurado en modo *warn-only* con `google_checks.xml`; **2,209 violaciones de estilo reportadas**, ninguna bloqueante, pendientes de limpieza incremental.

**Prueba E2E (Playwright) — nota de ejecución real:** se configuró `playwright.config.ts` + `e2e/smoke.spec.ts` contra el stack local real (frontend + backend + Neon). Al ejecutarla, la contraseña por defecto del administrador semilla (`Admin2024!`) ya había sido rotada manualmente durante pruebas previas de esta misma sesión, por lo que la prueba ejercitó su rama de repliegue documentada (verificar que el formulario de login muestra correctamente un error ante credenciales inválidas) en lugar del flujo completo login→dashboard. Queda **[Pendiente]** correr el flujo completo una vez se fije o se conozca una contraseña estable para el entorno de pruebas.

**Pruebas no realizadas [Pendiente]:**
- Pruebas de integración con base de datos real (`@SpringBootTest`, actualmente deshabilitado por falta de una base de datos de prueba dedicada).
- Pruebas de carga/rendimiento formales contra los umbrales del RNF-01 (< 10 s generación de PDF, < 2 s carga de calendario) — se realizó una medición puntual manual de latencia real contra Neon (`/actuator/health` 336 ms, `POST /api/auth/login` 655 ms, ambos con margen bajo 1 s), pero no una suite de carga formal.
- Suite E2E ampliada más allá de la prueba de humo (flujo completo crear→transicionar→descargar→reportar).
- Verificación de compatibilidad cross-browser (Chrome/Firefox/Safari/Edge) y responsividad real en dispositivos físicos (375 px–1920 px, RNF-05).

**Pipeline de CI/CD:** dos flujos en GitHub Actions (`backend-ci.yml`, `frontend-ci.yml`), cada uno con un *job* `test` (gate real) y un *job* `deploy` dependiente que solo se ejecuta en `push` a `main` con las pruebas en verde. El *job* `deploy` requiere 6 *secrets* de GitHub aún no configurados (tokens de Railway y Vercel), por lo que fallará hasta que se complete el paso de infraestructura descrito en la sección 4.

---

## 6. Guía de Instalación

Guía verificada paso a paso en un entorno Windows sin Docker, usando binarios *standalone* para los servicios de apoyo.

### 6.1. Requisitos previos

- Java 17+ y Maven (o el *wrapper* `mvnw` incluido en el proyecto).
- Node.js 20+ y npm.
- Una cuenta gratuita en [neon.tech](https://neon.tech) (base de datos PostgreSQL).

### 6.2. Base de datos (Neon)

1. Crear un proyecto en Neon y copiar el *connection string* provisto.
2. Convertirlo a formato JDBC:
   `jdbc:postgresql://<host>/<db>?sslmode=require&user=<usuario>&password=<password>`

### 6.3. Servicios locales de apoyo (sin credenciales de terceros)

1. Descargar `minio.exe` y `mc.exe` (cliente MinIO) y `mailpit.exe` — binarios *standalone* para Windows, sin instalación.
2. Levantar MinIO: `minio.exe server ./minio-data --address ":9000" --console-address ":9001"` (credenciales por defecto `minioadmin`/`minioadmin`).
3. Crear el *bucket* con `mc.exe`: `mc mb localminio/containertrack-photos`.
4. Levantar Mailpit: `mailpit.exe --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025`. La interfaz web para ver los correos capturados queda en `http://localhost:8025`.

### 6.4. Backend

1. Completar `backend/.env.local` con `DATABASE_URL` (Neon), `JWT_SECRET` (generado con `openssl rand -base64 32`), y las variables de MinIO/Mailpit locales (`R2_ENDPOINT=http://localhost:9000`, `MAIL_HOST=localhost`, `MAIL_PORT=1025`, etc.).
2. Ejecutar `./run-local.sh` (o `run-local.ps1` en PowerShell) desde `backend/` — el script carga las variables del `.env.local` y ejecuta `mvnw spring-boot:run`.
3. Flyway aplica automáticamente las 10 migraciones al arrancar.
4. Verificar `GET http://localhost:8080/actuator/health` → `{"status":"UP"}`.

### 6.5. Frontend

1. `cd containertrack-frontend && npm install`
2. `npm run dev` — sirve en `http://localhost:5173`, apuntando a `http://localhost:8080` (`.env.development`).

### 6.6. Acceso inicial

Usuario administrador por defecto: `admin@containertrack.gt` / `Admin2024!` (estado `PENDING_ACTIVATION`, fuerza cambio de contraseña en el primer acceso).

### 6.7. Despliegue a producción **[Pendiente]**

No ejecutado en este ciclo. Pasos documentados pero no realizados: creación de proyecto en Railway (backend, vía `Dockerfile`), creación de proyecto en Vercel (frontend), configuración de variables de entorno de producción reales (R2, SMTP), y configuración de los 6 *secrets* de GitHub Actions necesarios para el despliegue automático.

---

## 7. Referencias

Amazon Web Services. (2024). *AWS SDK for Java – Amazon S3*. https://docs.aws.amazon.com/sdk-for-java/

Axios. (2024). *Axios documentation*. https://axios-http.com/

Baeldung. (2024). *Spring Boot documentation and guides*. https://www.baeldung.com/

Cloudflare, Inc. (2024). *R2 storage documentation*. https://developers.cloudflare.com/r2/

date-fns contributors. (2024). *date-fns – Modern JavaScript date utility library*. https://date-fns.org/

Flyway. (2024). *Flyway database migrations documentation*. https://documentation.red-gate.com/flyway

International Organization for Standardization. (1995). *ISO 6346:1995 — Freight containers — Coding, identification and marking*. ISO.

International Organization for Standardization. (2004). *ISO 8601:2004 — Data elements and interchange formats — Information interchange — Representation of dates and times*. ISO.

International Organization for Standardization. (2011). *ISO/IEC 25010:2011 — Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE)*. ISO.

International Organization for Standardization. (2018). *ISO/IEC 9241-11:2018 — Ergonomics of human-system interaction — Usability: Definitions and concepts*. ISO.

International Organization for Standardization. (2018). *ISO/IEC 29101:2018 — Information technology — Security techniques — Privacy architecture framework*. ISO.

International Organization for Standardization. (2022). *ISO/IEC 27001:2022 — Information security, cybersecurity and privacy protection — Information security management systems — Requirements*. ISO.

iText Group. (2024). *iText 7 documentation*. https://itextpdf.com/en/resources/api-documentation

JUnit Team. (2024). *JUnit 5 user guide*. https://junit.org/junit5/docs/current/user-guide/

Mockito. (2024). *Mockito framework documentation*. https://site.mockito.org/

PostgreSQL Global Development Group. (2024). *PostgreSQL documentation*. https://www.postgresql.org/docs/

React Team. (2024). *React documentation*. https://react.dev/

Spring. (2024). *Spring Boot reference documentation* (versión 4.0.7). VMware, Inc. https://docs.spring.io/spring-boot/

Tailwind Labs. (2024). *Tailwind CSS documentation*. https://tailwindcss.com/docs

TanStack. (2024). *TanStack Query documentation*. https://tanstack.com/query/

Vitest. (2024). *Vitest — A Vite-native testing framework*. https://vitest.dev/

Sanchez Moscut, J. N. (2026). *ContainerTrack — DERCAS Visión: Sistema de gestión y monitoreo de contenedores* [Documento de especificación de requerimientos, Seminario de Sistemas]. Universidad Mariano Gálvez de Guatemala.

---

*Documento generado y actualizado como parte del ciclo de vida documental del Seminario de Sistemas — Universidad Mariano Gálvez de Guatemala.*
*DERCAS Técnico ContainerTrack · Versión 2 · Agosto 2026 · Verificado contra la implementación real del sistema.*
