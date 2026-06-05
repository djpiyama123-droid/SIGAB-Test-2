const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const SHOTS = '/home/gustavo/.claude/jobs/1bde175d/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

const MODULES = [
  { name: '01_Dashboard',       url: '/' },
  { name: '02_Equipos',         url: '/equipos' },
  { name: '03_Ordenes',         url: '/ordenes' },
  { name: '04_Preventivos',     url: '/preventivos' },
  { name: '05_Trazabilidad',    url: '/trazabilidad' },
  { name: '06_Alertas',         url: '/alertas' },
  { name: '07_Tecnovigilancia', url: '/tecnovigilancia' },
  { name: '08_Copilot',         url: '/copilot' },
  { name: '09_Reportes',        url: '/reportes' },
  { name: '10_Almacen',         url: '/almacen' },
  { name: '11_Metrologia',      url: '/metrologia' },
  { name: '12_Capacitaciones',  url: '/capacitaciones' },
  { name: '13_QRBatch',         url: '/qrbatch' },
  { name: '14_Auditoria',       url: '/auditoria' },
  { name: '15_Checklists',      url: '/checklists' },
];

const results = { ok: [], issues: [] };

(async () => {
  console.log('\n=== AUDITORÍA SIGAH v2 — misma página ===\n');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const allErrors = [];
  const allNet = [];

  page.on('console', m => { if (m.type() === 'error') allErrors.push(m.text().slice(0,120)); });
  page.on('response', r => { if (r.status() >= 400) allNet.push(`${r.status()} ${r.url().replace(BASE,'').slice(0,70)}`); });

  // LOGIN
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('input:not([type="password"])').first().fill('TEST001');
  await page.locator('input[type="password"]').fill('Test2026!');
  await page.locator('button[type="submit"], button:has-text("Ingresar")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});
  const loggedIn = !page.url().includes('/login');
  console.log(loggedIn ? '✅ Login OK' : '❌ Login FALLÓ');
  await page.screenshot({ path: `${SHOTS}/00_dashboard.png`, fullPage: false });

  // AUDITAR CADA MÓDULO — misma pestaña
  for (const mod of MODULES) {
    allErrors.length = 0; allNet.length = 0;

    await page.goto(`${BASE}${mod.url}`, { waitUntil: 'networkidle', timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const isLogin = page.url().includes('/login');
    const btns = await page.locator('button:visible').count();
    const inputs = await page.locator('input:visible, textarea:visible, select:visible').count();
    const tables = await page.locator('table, [role="grid"]').count();
    const modals = await page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').count();

    await page.screenshot({ path: `${SHOTS}/${mod.name}.png`, fullPage: true });

    // Intentar botón "Nuevo/Agregar"
    let hasModal = false;
    if (!isLogin) {
      const newBtn = page.locator('button:has-text("Nuevo"), button:has-text("Agregar"), button:has-text("Crear"), button:has-text("Nueva"), button:has-text("Registrar")').first();
      if (await newBtn.isVisible().catch(() => false)) {
        await newBtn.click();
        await page.waitForTimeout(800);
        const afterBtns = await page.locator('[role="dialog"] button:visible, [class*="modal"] button:visible').count();
        hasModal = afterBtns > 0;
        if (hasModal) {
          await page.screenshot({ path: `${SHOTS}/${mod.name}_modal.png` });
          console.log(`     → Modal/form abierto: ${afterBtns} botones`);
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    const jsErrs = allErrors.filter(e => !e.includes('favicon') && !e.includes('ERR_ABORTED'));
    const netErrs = allNet.filter(e => !e.includes('favicon') && !e.includes('OPTIONS'));
    const hasIssue = isLogin || jsErrs.length > 0;

    const status = { name: mod.name, url: mod.url, btns, inputs, tables, hasModal, jsErrs, netErrs, isLogin };
    if (hasIssue) {
      results.issues.push(status);
      const why = isLogin ? 'redirige a login' : jsErrs.slice(0,2).join(' | ');
      console.log(`  ⚠️  ${mod.name}: ${why}`);
    } else {
      results.ok.push(status);
      const api4xx = netErrs.filter(e => !e.includes('401') && !e.includes('404')).slice(0,2).join(', ');
      console.log(`  ✅ ${mod.name} — ${btns} btns, ${inputs} inputs, ${tables} tablas${hasModal?' [modal✓]':''}${api4xx?' NET:'+api4xx:''}`);
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN DE AUDITORÍA SIGAH');
  console.log('='.repeat(60));
  console.log(`✅ Módulos funcionales: ${results.ok.length} / ${MODULES.length}`);
  console.log(`⚠️  Con observaciones:   ${results.issues.length} / ${MODULES.length}`);

  if (results.ok.length) {
    console.log('\n--- ✅ MÓDULOS OK ---');
    for (const m of results.ok) {
      const net = m.netErrs.filter(e=>!e.includes('401')&&!e.includes('404'));
      console.log(`  ✅ ${m.name.padEnd(22)} ${m.btns} btns  ${m.inputs} inputs  ${m.tables} tablas${m.hasModal?'  modal✓':''}${net.length?' ⚠️NET:'+net.slice(0,1):''}`);
    }
  }
  if (results.issues.length) {
    console.log('\n--- ⚠️  OBSERVACIONES ---');
    for (const m of results.issues) {
      console.log(`  ${m.isLogin?'🔒':'⚠️'} ${m.name}: ${m.isLogin?'sin sesión':m.jsErrs.slice(0,1).join('')}`);
    }
  }

  fs.writeFileSync('/home/gustavo/.claude/jobs/1bde175d/audit_results_full.json', JSON.stringify({...results, ts:new Date().toISOString()}, null, 2));
  console.log('\nScreenshots: /home/gustavo/.claude/jobs/1bde175d/screenshots/');
})();
