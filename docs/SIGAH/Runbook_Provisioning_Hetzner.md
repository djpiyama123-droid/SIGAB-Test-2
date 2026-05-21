# Runbook — Provisioning de infraestructura SIGAH (Hetzner + dominio + DNS)

> **Audiencia:** Gustavo (ejecutor) y Carlos (revisor).
> **Tiempo estimado total:** 2 a 4 horas reloj, en una sola sesión.
> **Pre-requisito:** Tarjeta de crédito o débito internacional para Hetzner + presupuesto del dominio (~$350 MXN/año).
> **Resultado al cierre:** Servidor `sigah-staging` corriendo en Hetzner, con Docker + Traefik + HTTPS automático en `sigah.mx`, listo para que Fase 1 (multi-tenancy) empiece a desplegarse.

---

## Paso 0 — Antes de empezar

Tener a la mano:

- Correo personal (después se migra a `gustavo@sigah.mx` cuando esté el dominio).
- Tarjeta de crédito o débito internacional (Hetzner cobra en EUR).
- Llave SSH personal en tu equipo. Si no tienes una:

```bash
ssh-keygen -t ed25519 -C "gustavo@sigah.mx" -f ~/.ssh/sigah_ed25519
```

- Un gestor de contraseñas para guardar credenciales (1Password, Bitwarden, KeePass).

---

## Paso 1 — Crear cuenta en Hetzner Cloud

1. Ir a [https://accounts.hetzner.com/signUp](https://accounts.hetzner.com/signUp).
2. Registrar con correo personal. Verificar el correo.
3. Completar perfil con dirección personal (más tarde se migra a la razón social SIGAH cuando esté el RFC).
4. Agregar método de pago (tarjeta o PayPal).
5. Entrar a Hetzner Cloud Console: [https://console.hetzner.cloud](https://console.hetzner.cloud).
6. Crear un proyecto nuevo: nombre `SIGAH`.

**Guardar en gestor de contraseñas:** usuario, contraseña y URL del proyecto.

---

## Paso 2 — Subir la llave SSH al proyecto Hetzner

1. En el proyecto SIGAH → **Security** → **SSH Keys** → **Add SSH Key**.
2. Pegar el contenido de tu llave pública:

```bash
cat ~/.ssh/sigah_ed25519.pub
```

3. Nombre: `gustavo-laptop`. Guardar.

> Cuando Carlos también necesite acceso, agregar su llave igual y nombrarla `carlos-laptop`.

---

## Paso 3 — Provisionar el primer servidor

1. **Servers** → **Add Server**.
2. Configuración:
   - **Location:** Ashburn, VA (EE.UU.) — menor latencia desde Tijuana.
   - **Image:** Ubuntu 24.04 LTS.
   - **Type:** Shared vCPU → **CX32** (4 vCPU, 8 GB RAM, 80 GB NVMe). Costo: ~€7.59/mes (~$150 MXN/mes).
   - **Networking:** IPv4 + IPv6 (ambos activos).
   - **SSH Keys:** marcar `gustavo-laptop`.
   - **Name:** `sigah-staging`.
3. **Create & Buy now**.

En ~30 segundos el servidor está listo. Anota la **IPv4 pública** que aparece en el dashboard.

---

## Paso 4 — Primer acceso y endurecimiento del servidor

```bash
# Conectar como root con la llave
ssh -i ~/.ssh/sigah_ed25519 root@<IP_DEL_SERVIDOR>

# Actualizar paquetes
apt update && apt upgrade -y

# Crear usuario sigah (sin sudo de root directo)
adduser sigah --disabled-password --gecos ""
usermod -aG sudo sigah

# Copiar la llave SSH al nuevo usuario
mkdir -p /home/sigah/.ssh
cp /root/.ssh/authorized_keys /home/sigah/.ssh/
chown -R sigah:sigah /home/sigah/.ssh
chmod 700 /home/sigah/.ssh
chmod 600 /home/sigah/.ssh/authorized_keys

# Permitir sudo sin contraseña al usuario sigah (cómodo, ajustable después)
echo "sigah ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/sigah
chmod 440 /etc/sudoers.d/sigah

# Endurecer SSH: solo llaves, deshabilitar root
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Cerrar sesión y volver a entrar como `sigah`:

```bash
exit
ssh -i ~/.ssh/sigah_ed25519 sigah@<IP_DEL_SERVIDOR>
```

> Si el `ssh` falla aquí, el servidor quedó inaccesible. Restaura por la consola de rescate de Hetzner.

---

## Paso 5 — Firewall (UFW) y fail2ban

```bash
sudo apt install -y ufw fail2ban

# Reglas mínimas
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP (Let's Encrypt)
sudo ufw allow 443/tcp    # HTTPS
sudo ufw --force enable
sudo ufw status

# fail2ban con perfil SSH (default ya viene)
sudo systemctl enable --now fail2ban
sudo systemctl status fail2ban --no-pager
```

> **Hetzner Cloud Firewall** (alternativa): también se puede configurar en el dashboard de Hetzner — más limpio. UFW es la red de seguridad local.

---

## Paso 6 — Instalar Docker + Compose

```bash
# Repositorio oficial de Docker
curl -fsSL https://get.docker.com | sudo sh

# Permitir al usuario sigah usar docker sin sudo
sudo usermod -aG docker sigah
newgrp docker

# Verificar
docker --version
docker compose version
docker run --rm hello-world
```

---

## Paso 7 — Registrar dominio `sigah.mx`

1. Ir a [https://www.akky.mx](https://www.akky.mx) o [https://www.nic.mx](https://www.nic.mx).
2. Buscar `sigah.mx`. Si está libre: comprar por 1 año (~$350 MXN).
3. Crear cuenta a nombre personal de Gustavo (transferir a la empresa cuando exista RFC).
4. En el panel del registrador → **DNS** → agregar registros:

| Tipo  | Nombre | Valor             | TTL  |
|-------|--------|-------------------|------|
| `A`   | `@`    | `<IP_HETZNER>`    | 3600 |
| `A`   | `www`  | `<IP_HETZNER>`    | 3600 |
| `A`   | `app`  | `<IP_HETZNER>`    | 3600 |
| `A`   | `api`  | `<IP_HETZNER>`    | 3600 |
| `MX`  | `@`    | (configurar después con proveedor de correo) | 3600 |
| `TXT` | `@`    | `v=spf1 -all`     | 3600 |

5. La propagación toma de 5 minutos a 4 horas. Probar con:

```bash
dig sigah.mx +short
dig app.sigah.mx +short
```

> **Alternativa:** si quieren operar mientras propaga, usar `nip.io` con la IP — p. ej. `<IP>.nip.io`.

---

## Paso 8 — Reverse proxy con Traefik + HTTPS automático

En el servidor, como usuario `sigah`:

```bash
mkdir -p ~/sigah/traefik
cd ~/sigah/traefik
```

Crear `docker-compose.yml`:

```yaml
services:
  traefik:
    image: traefik:v3.1
    container_name: traefik
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=gustavo@sigah.mx"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "./letsencrypt:/letsencrypt"
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
    networks:
      - sigah

  whoami:
    image: traefik/whoami:latest
    container_name: whoami
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.whoami.rule=Host(`app.sigah.mx`)"
      - "traefik.http.routers.whoami.entrypoints=websecure"
      - "traefik.http.routers.whoami.tls.certresolver=letsencrypt"
    networks:
      - sigah

networks:
  sigah:
    name: sigah
```

Levantar:

```bash
mkdir -p letsencrypt && touch letsencrypt/acme.json && chmod 600 letsencrypt/acme.json
docker compose up -d
docker compose logs -f traefik    # observar la emisión del certificado
```

Abrir en el navegador `https://app.sigah.mx`. Si responde `whoami`, **HTTPS automático funciona**.

> **Nota:** la primera emisión de certificado tarda 1-2 minutos. Si Let's Encrypt falla, revisar que el DNS ya haya propagado.

---

## Paso 9 — Storage Box para respaldos

1. En Hetzner Robot ([https://robot.hetzner.com](https://robot.hetzner.com)) → **Storage Box** → contratar `BX11` (1 TB, ~€3.81/mes).
2. Anotar usuario, contraseña, host (`uXXXXX.your-storagebox.de`).
3. En el servidor, instalar `restic`:

```bash
sudo apt install -y restic

# Inicializar el repo de respaldos (una sola vez)
export RESTIC_REPOSITORY="sftp:uXXXXX@uXXXXX.your-storagebox.de:/sigah-backups"
export RESTIC_PASSWORD="<contraseña-fuerte-guardar-en-gestor>"
restic init
```

4. Configurar un cron diario (ejemplo, ajustarlo cuando ya exista BD):

```bash
# /etc/cron.d/sigah-backup
0 3 * * * sigah  /usr/local/bin/sigah-backup.sh
```

(El script `sigah-backup.sh` se crea cuando ya haya datos que respaldar, en Fase 1.)

---

## Paso 10 — Cuentas de IA (Anthropic + Google AI Studio)

### Anthropic

1. [https://console.anthropic.com](https://console.anthropic.com) → crear cuenta.
2. Agregar método de pago.
3. **Settings → Limits** → fijar límite mensual: `$30 USD` (~$550 MXN). Subir cuando haya demanda real.
4. **API Keys** → generar key `sigah-staging`. Guardar en gestor de contraseñas.

### Google AI Studio (Gemini)

1. [https://aistudio.google.com](https://aistudio.google.com) → entrar con cuenta Google.
2. **Get API key** → generar key `sigah-staging`.
3. Activar billing en Google Cloud Console (proyecto `sigah-staging`).
4. **Quotas** → fijar límite mensual: `$15 USD` (~$280 MXN).

> Guardar ambas keys en el gestor de contraseñas. **No** ponerlas en GitHub ni en CLAUDE.md.

---

## Paso 11 — Variables de entorno por ambiente

En el servidor, crear `~/sigah/.env.staging`:

```bash
# Hetzner staging — sigah-staging
SIGAH_ENV=staging
SIGAH_PUBLIC_BASE_URL=https://app.sigah.mx
SIGAH_API_BASE_URL=https://api.sigah.mx

# Base de datos (Fase 1)
SIGAH_DB_HOST=mysql
SIGAH_DB_PORT=3306
SIGAH_DB_NAME=sigah
SIGAH_DB_USER=sigah
SIGAH_DB_PASSWORD=<generar>

# JWT (Fase 2)
SIGAH_JWT_SECRET=<openssl rand -base64 48>
SIGAH_JWT_ALG=HS256
SIGAH_JWT_EXPIRES_MIN=720

# IA
ANTHROPIC_API_KEY=<key>
GEMINI_API_KEY=<key>
SIGAH_LLM_CHEAP_MODEL=gemini-2.5-flash-lite
SIGAH_LLM_SMART_MODEL=claude-sonnet-4-6

# Correo transaccional (Resend)
RESEND_API_KEY=<key>
SIGAH_MAIL_FROM=no-reply@sigah.mx
```

Permisos restrictivos:

```bash
chmod 600 ~/sigah/.env.staging
```

---

## Paso 12 — Verificación final (checklist de cierre)

| # | Verificación | Cómo verificar |
|---|--------------|----------------|
| 1 | Servidor accesible por SSH como `sigah` (no root) | `ssh sigah@<IP>` funciona, `ssh root@<IP>` falla |
| 2 | UFW activo con solo 22/80/443 abiertos | `sudo ufw status` |
| 3 | Docker y compose instalados, sin sudo para `sigah` | `docker ps` funciona |
| 4 | Dominio `sigah.mx` propagado | `dig sigah.mx +short` devuelve la IP |
| 5 | HTTPS automático en `app.sigah.mx` | navegador muestra `whoami` con candado verde |
| 6 | Storage Box de respaldos contratado | `restic snapshots` no falla |
| 7 | API keys de Anthropic y Gemini con límite mensual | revisar paneles de cada proveedor |
| 8 | `.env.staging` con permisos `600` | `ls -l ~/sigah/.env.staging` muestra `-rw-------` |

Cuando los 8 estén ✓ → **Fase 0 lado infraestructura está cerrado**. Falta solo el bloque legal (que corre en paralelo) y la marca.

---

## Anexo A — Snapshot / rollback

Antes de cualquier cambio mayor, sacar snapshot del servidor:

- Hetzner Console → servidor `sigah-staging` → **Snapshots** → **Take Snapshot** (costo: ~€0.01/GB/mes).
- Para restaurar: **Rebuild from snapshot**.

## Anexo B — Costos mensuales esperados (mes 1)

| Concepto | EUR | MXN (aprox) |
|----------|-----|-------------|
| Hetzner CX32 | €7.59 | $150 |
| Hetzner Storage Box BX11 | €3.81 | $75 |
| Dominio `sigah.mx` (prorrateado de $350/año) | — | $30 |
| Anthropic API (límite) | — | hasta $550 |
| Gemini API (límite) | — | hasta $280 |
| Resend (free tier inicial) | — | $0 |
| **Total mes 1 (sin tope IA usado)** | | **~$255 MXN** |
| **Total mes 1 (con tope IA al máximo)** | | **~$1,085 MXN** |

> Coincide con el escenario conservador del documento `Calculo_de_Costos_Cloud_IA_SIGAH.docx`.

---

## Anexo C — Cuándo migrar a CX42

Cuando se cumpla cualquiera de estos:

- 3er hospital cliente activo.
- Uso de RAM en CX32 supera el 70 % sostenido.
- Tiempos de respuesta del API > 500 ms en p95.

Hetzner permite el resize en caliente (~2 min de downtime).

---

_Runbook v1.0 — Mayo 2026. Actualizar al cierre de cada cambio mayor de infraestructura._
