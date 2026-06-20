const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = '/home/gustavo/.claude/jobs/1bde175d/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const results = { ok: [], errors: [], warnings: [] };

async function auditPage(page, name, url, actions = []) {
  console.log(`\n[AUDITANDO] ${name} → ${url}`);
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      networkErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 12000 });
    await page.waitForTimeout(1000);

    // Ejecutar acciones opcionales
    for (const action of actions) {
      try {
        await action(page);
        await page.waitForTimeout(500);
      } catch (e) {
        results.warnings.push(`${name}: acción falló — ${e.message.slice(0, 80)}`);
      }
    }

    const screenshotPath = `${SCREENSHOTS_DIR}/${name.replace(/\s+/g, '_')}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Contar botones visibles
    const buttons = await page.locator('button:visible').count();
    const links = await page.locator('a:visible').count();
    const inputs = await page.locator('input:visible, textarea:visible, select:visible').count();

    const status = {
      module: name,
      url,
      buttons,
      links,
      inputs,
      consoleErrors: consoleErrors.filter(e => !e.includes('favicon')),
      networkErrors: networkErrors.filter(e => !e.includes('favicon')),
      screenshot: screenshotPath,
    };

    const hasErrors = status.consoleErrors.length > 0 || status.networkErrors.length > 0;
    if (hasErrors) {
      results.errors.push(status);
      console.log(`  ❌ ERRORES: ${[...status.consoleErrors, ...status.networkErrors].join(' | ')}`);
    } else {
      results.ok.push(status);
      console.log(`  ✅ OK — ${buttons} botones, ${inputs} inputs`);
    }

    return status;
  } catch (e) {
    const status = { module: name, url, error: e.message.slice(0, 120) };
    results.errors.push(status);
    console.log(`  ❌ CRASH: ${e.message.slice(0, 120)}`);
    return status;
  }
}

async function login(page) {
  console.log('\n[LOGIN] Autenticando...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 12000 });
  await page.waitForTimeout(500);

  // Screenshot login
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/00_login.png`, fullPage: true });

  // Intentar credenciales comunes SIGAH
  const credSets = [
    { user: 'admin', pass: 'admin123' },
    { user: 'admin@sigah.mx', pass: 'admin123' },
    { user: 'admin', pass: 'admin' },
    { user: 'tecnico', pass: 'tecnico123' },
  ];

  for (const creds of credSets) {
    try {
      const userField = page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first();
      const passField = page.locator('input[type="password"]').first();

      await userField.fill(creds.user);
      await passField.fill(creds.pass);

      const submitBtn = page.locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Login"), button:has-text("Entrar")').first();
      await submitBtn.click();

      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (!currentUrl.includes('/login')) {
        console.log(`  ✅ Login exitoso con: ${creds.user}`);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/00_post_login.png`, fullPage: true });
        return true;
      }
    } catch (e) {
      // intenta siguiente
    }
  }

  console.log('  ⚠️  No pudo autenticar — continuando sin sesión (capturas mostraran redirect)');
  return false;
}

(async () => {
  console.log('=== AUDITORÍA SIGAH FRONTEND ===');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // LOGIN
  const loggedIn = await login(page);

  // MÓDULOS A AUDITAR
  const modules = [
    { name: '01_Dashboard', url: '/' },
    { name: '02_Equipos', url: '/equipos', actions: [
      async p => {
        const btn = p.locator('button:has-text("Nuevo"), button:has-text("Agregar"), button:has-text("Registrar")').first();
        if (await btn.isVisible()) { await btn.click(); await p.waitForTimeout(500); }
      }
    ]},
    { name: '03_Ordenes', url: '/ordenes', actions: [
      async p => {
        const btn = p.locator('button:has-text("Nueva"), button:has-text("Crear"), button:has-text("Agregar")').first();
        if (await btn.isVisible()) { await btn.click(); await p.waitForTimeout(500); }
      }
    ]},
    { name: '04_Preventivos', url: '/preventivos' },
    { name: '05_Trazabilidad', url: '/trazabilidad' },
    { name: '06_Alertas', url: '/alertas' },
    { name: '07_Tecnovigilancia', url: '/tecnovigilancia' },
    { name: '08_Copilot', url: '/copilot', actions: [
      async p => {
        const input = p.locator('textarea, input[placeholder*="mensaje"], input[placeholder*="escribe"], input[placeholder*="pregunta"]').first();
        if (await input.isVisible()) {
          await input.fill('Prueba de conexión');
          await p.keyboard.press('Enter');
          await p.waitForTimeout(1500);
        }
      }
    ]},
    { name: '09_Reportes', url: '/reportes' },
    { name: '10_Almacen', url: '/almacen' },
    { name: '11_Metrologia', url: '/metrologia' },
    { name: '12_Capacitaciones', url: '/capacitaciones' },
    { name: '13_QRBatch', url: '/qrbatch' },
    { name: '14_Auditoria', url: '/auditoria' },
    { name: '15_Checklists', url: '/checklists' },
  ];

  for (const mod of modules) {
    const modPage = await context.newPage();
    // Copiar cookies de la sesión
    await auditPage(modPage, mod.name, mod.url, mod.actions || []);
    await modPage.close();
  }

  await browser.close();

  // REPORTE FINAL
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN DE AUDITORÍA SIGAH');
  console.log('='.repeat(60));
  console.log(`✅ Módulos OK:      ${results.ok.length}`);
  console.log(`❌ Módulos con error: ${results.errors.length}`);
  console.log(`⚠️  Advertencias:    ${results.warnings.length}`);

  if (results.ok.length > 0) {
    console.log('\n--- MÓDULOS OK ---');
    for (const m of results.ok) {
      console.log(`  ✅ ${m.module} — ${m.buttons} botones, ${m.inputs} inputs`);
    }
  }

  if (results.errors.length > 0) {
    console.log('\n--- MÓDULOS CON ERRORES ---');
    for (const m of results.errors) {
      console.log(`  ❌ ${m.module}`);
      if (m.error) console.log(`     CRASH: ${m.error}`);
      if (m.consoleErrors?.length) console.log(`     JS: ${m.consoleErrors.slice(0, 3).join(' | ')}`);
      if (m.networkErrors?.length) console.log(`     NET: ${m.networkErrors.slice(0, 3).join(' | ')}`);
    }
  }

  if (results.warnings.length > 0) {
    console.log('\n--- ADVERTENCIAS ---');
    for (const w of results.warnings) console.log(`  ⚠️  ${w}`);
  }

  // Guardar JSON
  fs.writeFileSync(
    '/home/gustavo/.claude/jobs/1bde175d/audit_results.json',
    JSON.stringify({ timestamp: new Date().toISOString(), loggedIn, ...results }, null, 2)
  );
  console.log('\nResultados JSON: /home/gustavo/.claude/jobs/1bde175d/audit_results.json');
  console.log(`Screenshots: ${SCREENSHOTS_DIR}/`);
})();
