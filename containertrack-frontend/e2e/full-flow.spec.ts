import { test, expect, type Locator } from "@playwright/test";

// Admin seeded in backend/src/main/resources/db/migration/V9__insert_default_admin.sql.
// Same tolerance as smoke.spec.ts: this runs against a live dev DB whose exact state
// (password already rotated? admin already activated?) isn't guaranteed.
const ADMIN_EMAIL = "admin@containertrack.gt";
const ADMIN_PASSWORD = "Admin2024!";

const RUN_ID = Date.now();

// ISO 6346 check-digit algorithm, mirrored from
// backend/src/main/java/com/containertrack/validation/ContainerNumberValidator.java —
// needed to generate a fresh, backend-valid container number per run (a hardcoded
// example would collide with itself on the second test run: DUPLICATE_CONTAINER).
function buildContainerNumber(serial: number): string {
  const letterValues: Record<string, number> = {};
  let value = 10;
  for (let i = 0; i < 26; i++) {
    if (value % 11 === 0) value++;
    letterValues[String.fromCharCode(65 + i)] = value;
    value++;
  }
  const body = "ABCU" + String(serial % 1_000_000).padStart(6, "0");
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = body[i];
    const charValue = /[A-Z]/.test(c) ? letterValues[c] : c.charCodeAt(0) - 48;
    sum += charValue * 2 ** i;
  }
  const mod = sum % 11;
  const checkDigit = mod === 10 ? 0 : mod;
  return body + checkDigit;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dateInput(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function dateTimeInput(hoursFromNow: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  // datetime-local wants "YYYY-MM-DDTHH:mm", no seconds/zone.
  return d.toISOString().slice(0, 16);
}

/** The <select>s this test fills are populated asynchronously (react-query fetch after
 *  the modal opens) — right after the modal renders they still only hold the placeholder
 *  option. Unlike Playwright's native .selectOption() (which polls internally), a single
 *  evaluateAll() has no retry of its own, so wait for real options to land first. */
async function waitForOptions(select: Locator): Promise<void> {
  await expect
    .poll(async () => select.locator("option").count(), { timeout: 10_000 })
    .toBeGreaterThan(1);
}

/** Selects the <option> whose text contains `substring` — needed wherever the option
 *  set isn't fully under this test's control (shared live DB may have other rows). */
async function selectOptionContaining(select: Locator, substring: string): Promise<void> {
  await waitForOptions(select);
  const value = await select.locator("option").evaluateAll((opts, needle) => {
    const found = opts.find((o) => (o.textContent ?? "").includes(needle));
    return found ? (found as HTMLOptionElement).value : null;
  }, substring);
  if (!value) {
    throw new Error(`No <option> containing "${substring}" found in select`);
  }
  await select.selectOption(value);
}

/** Finds a <tr> containing `text`, paging forward through a <Pagination> component if
 *  needed — this live shared DB accumulates rows across every manual/test run, so a
 *  freshly created row isn't guaranteed to land on page 0 under default (unspecified)
 *  backend sort order. */
async function findRowAcrossPages(page: import("@playwright/test").Page, text: string | RegExp): Promise<Locator> {
  const nextButton = page.getByRole("button", { name: "Página siguiente" });
  for (let i = 0; i < 50; i++) {
    const row = page.getByRole("row", { name: text });
    // A row created moments ago may not be in the list query's cache yet — the create
    // mutation's invalidateQueries() triggers a refetch, but that's async, so give the
    // CURRENT page a short retry window before concluding it isn't here and paging on.
    const found = await row
      .waitFor({ state: "attached", timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (found) return row;
    if (!(await nextButton.isEnabled().catch(() => false))) break;
    await nextButton.click();
  }
  throw new Error(`Row matching "${text}" not found across any page`);
}

/** Selects the first non-empty <option> whose text isn't in `excluded` — used for
 *  "any foreign port" where the exact seeded catalog (V10 migration) may have since
 *  been edited by hand in this shared live DB, so a hardcoded port name isn't safe. */
async function selectOptionExcluding(select: Locator, excluded: string[]): Promise<void> {
  await waitForOptions(select);
  const value = await select.locator("option").evaluateAll((opts, excludedList) => {
    const found = opts.find(
      (o) => (o as HTMLOptionElement).value !== "" && !excludedList.includes(o.textContent ?? ""),
    );
    return found ? (found as HTMLOptionElement).value : null;
  }, excluded);
  if (!value) {
    throw new Error(`No selectable <option> outside of [${excluded.join(", ")}] found in select`);
  }
  await select.selectOption(value);
}

test("full lifecycle: register -> transition -> assign warehouse -> discharge -> PDF", async ({ page, browser }) => {
  // Real backend + real (local) storage round-trips, well past Playwright's 30s default.
  test.setTimeout(90_000);
  // --- Admin login -------------------------------------------------------
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 }),
    page.getByText(/inválid|incorrect|bloquead|no se pudo conectar/i).waitFor({ timeout: 15_000 }),
  ]).catch(() => {});

  test.skip(page.url().includes("/login"), "Admin credentials have been rotated in this live environment.");
  test.skip(
    page.url().includes("/change-password"),
    "Admin account requires a forced password change — not safe to drive automatically without knowing its real intended password.",
  );

  // --- Create a shipping company (none seeded) ----------------------------
  const companyName = `E2E Naviera ${RUN_ID}`;
  await page.goto("/navieras");
  await page.getByRole("button", { name: "Nueva Naviera" }).click();
  const companyForm = page.locator("#shipping-company-form input");
  await companyForm.nth(0).fill(companyName); // name
  await companyForm.nth(1).fill(`E2E${RUN_ID}`); // shortCode
  await companyForm.nth(2).fill("Guatemala"); // country
  await page.locator('button[form="shipping-company-form"]').click();
  await expect(page.getByText("Naviera creada correctamente")).toBeVisible({ timeout: 10_000 });

  // --- Create a WAREHOUSE user (DEPARTED_PORT->ARRIVED_WAREHOUSE and the
  // final discharge are WAREHOUSE-only, even for ADMIN — see usePermissions.ts) --
  const warehouseEmail = `e2e.warehouse.${RUN_ID}@containertrack.gt`;
  const warehouseName = `E2E Bodega ${RUN_ID}`;
  await page.goto("/users");
  await page.getByRole("button", { name: "Nuevo Usuario" }).click();
  const userForm = page.locator("#user-form input");
  await userForm.nth(0).fill(warehouseName); // fullName
  await userForm.nth(1).fill(warehouseEmail); // email
  // The radio input is visually `sr-only` (zero-size, off-screen) — the clickable
  // surface is the wrapping <label>. Dispatching the click directly on the input
  // bypasses Playwright's bounding-box/visibility requirements entirely.
  await page.locator('#user-form input[type="radio"][value="WAREHOUSE"]').dispatchEvent("click");
  await page.locator('button[form="user-form"]').click();
  await expect(page.getByText("Usuario creado correctamente")).toBeVisible({ timeout: 10_000 });

  // --- Reset that user's password to a known value via the admin flow
  // (no email access in CI — the real temp password only ever goes out by email) ---
  const tempPassword = "Warehouse123!";
  const finalPassword = "WarehouseFinal123!";
  const userRow = await findRowAcrossPages(page, new RegExp(escapeRegExp(warehouseEmail)));
  await userRow.getByRole("button", { name: "Restablecer contraseña" }).click();
  await page.getByLabel("Contraseña temporal").fill(tempPassword);
  await page.locator('button[form="reset-password-form"]').click();
  await expect(page.getByText("Contraseña restablecida")).toBeVisible({ timeout: 10_000 });

  // --- Activate the WAREHOUSE user now (separate browser context/session from
  // admin's). GET /api/users/active — used to populate the warehouse-assignee
  // dropdown later — only returns status=ACTIVE users; a PENDING_ACTIVATION user
  // (true until its first login+change-password) would never show up in that
  // list, so this has to happen before the container even exists. -------------
  const warehouseContext = await browser.newContext();
  const wPage = await warehouseContext.newPage();
  await wPage.goto("/login");
  await wPage.getByLabel("Correo electrónico").fill(warehouseEmail);
  await wPage.getByLabel("Contraseña", { exact: true }).fill(tempPassword);
  await wPage.getByRole("button", { name: "Iniciar sesión" }).click();
  await wPage.waitForURL(/\/change-password/, { timeout: 15_000 });

  await wPage.getByLabel("Contraseña actual").fill(tempPassword);
  await wPage.getByLabel("Nueva contraseña", { exact: true }).fill(finalPassword);
  await wPage.getByLabel("Confirmar nueva contraseña").fill(finalPassword);
  await wPage.getByRole("button", { name: "Guardar nueva contraseña" }).click();
  await wPage.waitForURL((url) => !url.pathname.includes("/change-password"), { timeout: 15_000 });

  // --- Create the container (admin as its own responsible operator) ------
  const containerNumber = buildContainerNumber(RUN_ID);
  await page.goto("/containers");
  await page.getByRole("button", { name: "Nuevo Contenedor" }).click();

  await page.getByLabel("Número de BL").fill(`BL-E2E-${RUN_ID}`);
  await page.getByLabel("Número de contenedor").fill(containerNumber);
  await selectOptionContaining(page.locator("#container-form select").nth(0), companyName); // shippingCompanyId
  // Any non-Guatemalan port works as origin — don't hardcode a specific seeded name,
  // the live catalog may have been edited since V10's migration data.
  await selectOptionExcluding(page.getByLabel("Puerto de origen"), [
    "Puerto Quetzal",
    "Puerto Santo Tomás de Castilla",
    "Puerto Barrios",
  ]);
  await page.getByLabel("Puerto de destino").selectOption({ label: "Puerto Quetzal" });
  await selectOptionContaining(page.locator("#container-form select").nth(3), "(ADMIN)"); // responsibleOperatorId
  await page.getByLabel("Fecha estimada de salida").fill(dateInput(0));
  await page.getByLabel("Descripción de la carga").fill("Carga de prueba E2E");
  await page.locator('button[form="container-form"]').click();
  await expect(page.getByText("Contenedor creado correctamente")).toBeVisible({ timeout: 10_000 });

  // Navigate into the newly created container's detail page. The list is paginated and
  // this live shared DB can hold far more than one page of history, so the new row isn't
  // necessarily on page 0 — filter by the (freshly created, so unique) shipping company
  // first to guarantee exactly one match regardless of how much other data exists.
  await selectOptionContaining(page.locator("select").first(), companyName); // "Naviera" filter
  await page.getByRole("row", { name: new RegExp(containerNumber) }).getByRole("link", { name: "Ver" }).click();
  await expect(page).toHaveURL(/\/containers\/\d+/);
  const containerUrl = page.url();

  // "Actual" dates are rejected by the backend if they resolve to after `now` (FUTURE_DATE).
  // dateInput() builds the string from the test runner's local clock and the app converts
  // it as Guatemala-midnight — using "today" risks tipping past the real UTC `now` depending
  // on this machine's timezone. Stay several full days in the past for safety margin.
  // --- REGISTERED -> DEPARTED_ORIGIN (ADMIN-eligible) ---------------------
  await page.getByRole("button", { name: "Registrar salida de origen" }).click();
  await page.locator("#transition-form input").nth(0).fill(dateInput(-4)); // actualDepartureDate
  await page.locator('button[form="transition-form"]').click();
  await expect(page.getByText("Estado actualizado correctamente")).toBeVisible({ timeout: 10_000 });

  // --- DEPARTED_ORIGIN -> ARRIVED_PORT (ADMIN-eligible) --------------------
  await page.getByRole("button", { name: "Registrar llegada a puerto" }).click();
  await page.locator("#transition-form input").nth(0).fill(dateInput(-3)); // actualArrivalPort
  await page.locator('button[form="transition-form"]').click();
  await expect(page.getByText("Estado actualizado correctamente")).toBeVisible({ timeout: 10_000 });

  // --- Assign the warehouse user now that the container is at port --------
  await selectOptionContaining(page.locator("select").first(), warehouseName);
  await page.getByRole("button", { name: "Asignar" }).click();
  await expect(page.getByText(/asignad/i)).toBeVisible({ timeout: 10_000 });

  // --- ARRIVED_PORT -> DEPARTED_PORT (still ADMIN-eligible) ---------------
  await page.getByRole("button", { name: "Registrar salida de puerto" }).click();
  await page.locator("#transition-form input").nth(0).fill(dateInput(-2)); // actualDeparturePort
  await page.locator("#transition-form input").nth(1).fill(dateInput(1)); // estimatedArrivalWarehouse (estimate, no future check)
  await page.locator('button[form="transition-form"]').click();
  await expect(page.getByText("Estado actualizado correctamente")).toBeVisible({ timeout: 10_000 });

  // --- Permission boundary: DEPARTED_PORT -> ARRIVED_WAREHOUSE is
  // WAREHOUSE-only, even for ADMIN (usePermissions.ts TRANSITION_ROLES) ------
  await expect(page.getByRole("button", { name: "Registrar llegada a bodega" })).not.toBeVisible();

  // --- Switch identity: the WAREHOUSE user (already activated above) picks up
  // from here in its own isolated session -----------------------------------
  await wPage.goto(containerUrl);

  // --- DEPARTED_PORT -> ARRIVED_WAREHOUSE (now visible/allowed: assigned WAREHOUSE) --
  await wPage.getByRole("button", { name: "Registrar llegada a bodega" }).click();
  await wPage.locator("#transition-form input").nth(0).fill(dateInput(-1)); // actualArrivalWarehouse
  await wPage.locator('button[form="transition-form"]').click();
  await expect(wPage.getByText("Estado actualizado correctamente")).toBeVisible({ timeout: 10_000 });
  // The photo panel only renders once the container is ARRIVED_WAREHOUSE/DISCHARGED —
  // a concrete, state-dependent check that the transition actually landed, instead of
  // trusting the toast alone (which can't distinguish a real success from a stale one).
  await expect(wPage.getByRole("heading", { name: "Evidencia fotográfica" })).toBeVisible({ timeout: 10_000 });

  // --- Upload evidence photo (preview-then-confirm flow) -------------------
  // 1x1 transparent PNG — smallest valid image/png payload, no fixture file needed.
  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await wPage.locator('input[type="file"]').setInputFiles({
    name: "evidencia.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await wPage.getByRole("button", { name: /^Subir \d+ foto/ }).click();
  // Generous timeout: a cold local MinIO/R2 connection makes the first upload noticeably
  // slower than everything else in this flow.
  await expect(wPage.getByText(/foto.*subida/i)).toBeVisible({ timeout: 30_000 });

  // --- Discharge (closes the lifecycle, WAREHOUSE-only) --------------------
  await wPage.getByRole("button", { name: "Finalizar descarga" }).click();
  const dischargeInputs = wPage.locator("#discharge-form input");
  await dischargeInputs.nth(0).fill(dateTimeInput(0)); // dischargeStartAt
  await dischargeInputs.nth(1).fill(dateTimeInput(1)); // dischargeEndAt
  await wPage.locator('button[form="discharge-form"]').click();
  await expect(wPage.getByText("Descarga finalizada correctamente")).toBeVisible({ timeout: 10_000 });
  await expect(wPage.getByText("Finalizar descarga")).not.toBeVisible();

  // --- Download the individual PDF report (any authenticated role can) ----
  const [download] = await Promise.all([
    wPage.waitForEvent("download"),
    wPage.getByRole("button", { name: "Descargar PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

  await warehouseContext.close();
});
