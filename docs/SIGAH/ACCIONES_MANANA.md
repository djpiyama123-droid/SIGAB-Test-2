# Acciones para mañana — Asus TUF A16

> **Cuándo:** mañana 18 de mayo de 2026, AM.
> **Objetivo:** dejar tu Asus listo y arrancar QA real del frontend SIGAH con Playwright + Fase 0 en el mundo real.
> **Tiempo total estimado:** 2.5–3.5 horas de trabajo, incluyendo gestiones externas.

---

## 0 · Antes de prender el Asus (10 min, mientras desayunas)

| ☐ | Acción | Cómo |
|---|--------|------|
| ☐ | Agendar **cita SAT** para e.firma — Gustavo | [https://citas.sat.gob.mx](https://citas.sat.gob.mx) — trámite "Genera y/o renueva tu e.firma" |
| ☐ | Agendar **cita SAT** para e.firma — Carlos | Que Carlos saque su propia cita |
| ☐ | Confirmar password de tu cuenta Bluehost (cPanel) | Necesario para pegar la llave SSH en el VPS |

---

## 1 · Setup técnico del Asus (15 min, una sola vez de por vida)

Abre Windows Terminal en la carpeta del repo:

```powershell
cd C:\Users\djpiy\Desktop\Bioingeneria\SIGAB
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\scripts\setup_claude_code_sigah.ps1
```

El script hace 6 cosas: verifica Node, instala Claude Code CLI, clona y copia 14 skills oficiales de Anthropic a `~/.claude/skills/`, anexa SSH a `~/.ssh/config`, genera llave `sigab_bluehost_ed25519`, prepara `connections.json` de la skill mysql.

**Verifica al final del script:**

```powershell
ls ~/.claude/skills | measure   # debe decir 14
ls .claude\skills | measure     # debe decir 12 (incluyendo webapp-testing)
claude --version                # debe responder
```

---

## 2 · Conectar al VPS Bluehost (15 min)

```powershell
# 2.1 Copiar la llave pública al portapapeles
type $env:USERPROFILE\.ssh\sigab_bluehost_ed25519.pub | Set-Clipboard
```

Entra al VPS Bluehost una vez (con tu método actual: cPanel SSH, o `ssh root@129.121.100.147` con password) y pega:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "<PEGA_LA_LLAVE_AQUI>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Edita** `~/.ssh/config` en el Asus y reemplaza `<USUARIO_BLUEHOST>` por tu usuario real del VPS (típicamente `root`).

Prueba sin password:

```powershell
ssh sigab-bluehost   # debe entrar directo, sin pedirte password
```

---

## 3 · Crear cuenta Hetzner Cloud (20 min, en paralelo)

```
https://accounts.hetzner.com/signUp
```

Sigue los pasos 1–4 del `Runbook_Provisioning_Hetzner.md` (cuenta, proyecto SIGAH, SSH key del Asus, provisionar `sigah-staging` CX32). Esto te deja un servidor Linux funcionando por ~$150 MXN/mes.

**Marca el resultado en el checklist Fase 0:** `Fase_0_Checklist_Operativo_SIGAH.docx`, bloque 2 (Infraestructura cloud).

---

## 4 · Registrar dominio sigah.mx (15 min)

```
https://www.akky.mx  →  buscar "sigah.mx"  →  comprar 1 año (~$350 MXN)
```

Configurar DNS (registros A) apuntando a la IP del CX32 de Hetzner — ver runbook paso 7.

---

## 5 · Arrancar Claude Code y validar el contexto (10 min)

```powershell
cd C:\Users\djpiy\Desktop\Bioingeneria\SIGAB
git pull
claude
```

Dentro de Claude Code, tu primer prompt:

> *"Lee `docs/SIGAH/WORKBOOK_MAESTRO_SIGAH.md` y dame el estado actual del proyecto. Confírmame qué sigue del checklist Fase 0 y de Fase 1."*

Claude debe responder con la sección 9 del workbook (estado + siguiente sprint), demostrando que tiene el contexto cargado.

---

## 6 · Pulir SIGAH web con Playwright (la pieza nueva, 1–2 horas)

**Esta es la pieza que me pediste reforzar.** El objetivo: arrancar el QA visual del frontend SIGAH actual usando la skill `webapp-testing`.

### 6.1 Levantar el frontend local

Dos terminales:

```powershell
# Terminal A: backend
cd sigab-backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

```powershell
# Terminal B: frontend
cd sigab-frontend
npm install      # solo la primera vez
npm run dev      # corre en http://localhost:5173
```

### 6.2 Sesión de QA con Claude + Playwright

En Claude Code:

> *"Activa la skill `webapp-testing` y haz un walkthrough completo del frontend SIGAH local (http://localhost:5173). Para cada una de las 9 páginas — Dashboard, Equipos, Escanear QR, Órdenes, Preventivos, Alertas, Reportes, Tecnovigilancia, Copilot — abre la página, captura screenshot, valida que no haya errores en consola, y reporta cualquier botón que no responda, label confusa, o flujo no intuitivo. Genera un reporte priorizado en `docs/SIGAH/QA_Playwright_v1.md` con: pantalla, hallazgo, severidad (alta/media/baja), recomendación."*

### 6.3 Hallazgos típicos a esperar

| Tipo | Ejemplo |
|------|---------|
| Botón sin loading state | "Guardar" se queda mudo 3 segundos sin feedback. |
| Modal sin botón de cierre | Solo `Esc`, falta la X. |
| Label ambigua | "Cancelar" en formulario que en realidad borra. |
| Mensaje de error inútil | "Error 500" en vez de "No se pudo conectar al servidor". |
| Tabla no responsive | En 1280px se rompe la tabla de equipos. |
| Dark mode roto | El copilot tiene texto blanco sobre blanco. |
| Empty state vacío | "Sin alertas" sin ilustración ni call-to-action. |

### 6.4 Cierre del día de QA

Después del walkthrough:

> *"Convierte el reporte `QA_Playwright_v1.md` en issues atómicas de GitHub usando la skill `ccpm`. Cada hallazgo de severidad alta o media = una issue, con criterios de aceptación claros."*

---

## 7 · Checklist de cierre (5 min)

Al final del día, antes de cerrar el Asus:

```powershell
git status                                        # ver qué cambió
git add -p                                        # agregar por chunks
git commit -m "qa: walkthrough Playwright v1 + setup Asus TUF"
git push origin sigah-saas
exit                                              # cerrar túneles SSH abiertos
```

Marca en `Fase_0_Checklist_Operativo_SIGAH.docx` lo que avanzaste:

| ☐ | F0 — Bloque 1 (legal) | 1.1, 1.2 agendadas |
| ☐ | F0 — Bloque 2 (infra) | 2.1–2.7 si te dio tiempo |
| ☐ | F0 — Bloque 5 (marca) | 5.5 correos cuando esté el dominio |
| ☐ | Nuevo bloque QA: walkthrough v1 generado y subido |

---

## 8 · Tres preguntas que conviene resolver mañana mismo

Anótalas en una nota para no olvidar:

1. **¿Te quedas con la S. de R.L. de C.V. + RESICO PM** (recomendado) **o prefieres arrancar con S.A.S. gratis y migrar después**? Define con Carlos en la mañana.
2. **¿El Setup Fee de cada hospital es $15K, $20K o $25K MXN?** Define para poder cotizar al siguiente prospecto.
3. **Después del walkthrough Playwright, ¿cuál es la pantalla #1 a re-diseñar?** (Probablemente el Dashboard, por visibilidad ejecutiva).

---

## 9 · Si algo falla, el rescate

| Síntoma | Fix rápido |
|---------|-----------|
| Setup script falla en el paso de Node | Instala Node LTS desde nodejs.org y vuelve a correrlo. |
| `ssh sigab-bluehost` pide password | Edita `~/.ssh/config`, reemplaza `<USUARIO_BLUEHOST>` por `root` (o el usuario real). |
| `npm run dev` falla con módulos no encontrados | `cd sigab-frontend && rm -rf node_modules && npm install`. |
| Playwright dice "Chromium not installed" | Dentro de la skill `webapp-testing` corre `playwright install chromium`. |
| Claude Code no ve las 12 skills del proyecto | Estás fuera del repo. `cd C:\Users\djpiy\Desktop\Bioingeneria\SIGAB && claude`. |
| Te bloqueaste con cualquier cosa | Abre `docs/SIGAH/WORKBOOK_MAESTRO_SIGAH.md` §11 (troubleshooting). |

---

## 10 · Métricas de éxito del día

Al final del día, una buena jornada se mide así:

- ☐ Asus TUF queda configurado: Claude Code + 26 skills + SSH funcionando.
- ☐ Llave SSH pegada en VPS Bluehost: `ssh sigab-bluehost` sin password.
- ☐ Cuenta Hetzner creada + servidor `sigah-staging` provisionado.
- ☐ Citas SAT agendadas para los dos.
- ☐ Walkthrough Playwright del frontend ejecutado y reporte generado.
- ☐ Al menos 3 issues abiertas en GitHub a partir del reporte de QA.
- ☐ Commit y push de los avances del día.

Si logras 5 de 7 → muy buen día. Si logras 7 de 7 → llevas un día de adelanto sobre el sprint propuesto.

---

_Imprime o ten abierto este archivo mañana en la mañana. Es lo único que necesitas a la vista._

_v1.0 — 17 de mayo de 2026, Gustavo._
