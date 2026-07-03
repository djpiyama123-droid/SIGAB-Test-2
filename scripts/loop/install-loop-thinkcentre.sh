#!/usr/bin/env bash
# Instala el loop de mejora continua en el ThinkCentre (correr con sudo).
# Idempotente. El ciclo de Claude corre con ALLOWLIST RESTRICTIVA
# (scripts/loop/settings-loop.json — solo frontend, git y npm; sin
# skip-permissions): lo no permitido se deniega y el ciclo falla limpio.
# Requiere: repo en /opt/sigab (rama v4.0), claude autenticado como root
# (sudo claude login — hazlo ANTES o el guard saltará cada ciclo), y llave
# SSH del ThinkCentre autorizada en el VPS (para el deploy del runner).
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo "correr con sudo"; exit 1; }

REPO=/opt/sigab
cd "$REPO"
git fetch origin v4.0/piloto-clinica-1 --quiet
git checkout -B v4.0/piloto-clinica-1 origin/v4.0/piloto-clinica-1 --quiet

# allowlist del ciclo (gitignored en el checkout; fuente versionada en scripts/loop/)
mkdir -p .claude && cp scripts/loop/settings-loop.json .claude/settings.json

# remote del espejo (best-effort)
git remote get-url v4 >/dev/null 2>&1 || \
  git remote add v4 git@github.com:djpiyama123-droid/SIGAB-v4.git || true

# host keys de github (el fetch/push por SSH falla sin esto en nodo virgen)
mkdir -p /root/.ssh && chmod 700 /root/.ssh
grep -q "github.com" /root/.ssh/known_hosts 2>/dev/null || \
  ssh-keyscan -t ed25519,rsa,ecdsa github.com >> /root/.ssh/known_hosts 2>/dev/null

# ssh del runner al VPS (el RUNNER despliega, no Claude — Claude tiene ssh denegado)
if ! grep -q "Host sigab-vps" /root/.ssh/config 2>/dev/null; then
  [[ -f /root/.ssh/id_ed25519 ]] || ssh-keygen -t ed25519 -N "" -f /root/.ssh/id_ed25519 -C "loop@thinkcentre"
  cat >> /root/.ssh/config <<'EOF'
Host sigab-vps
    HostName sigab-vps
    User root
    IdentityFile /root/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
EOF
  echo ">>> Autoriza esta llave en el VPS (authorized_keys de root):"
  cat /root/.ssh/id_ed25519.pub
fi

chmod +x scripts/loop/ciclo-mejora.sh

cat > /etc/systemd/system/sigab-loop.service <<EOF
[Unit]
Description=SIGAB v4.x — ciclo de mejora continua (Claude, allowlist restrictiva)
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$REPO
ExecStart=$REPO/scripts/loop/ciclo-mejora.sh
TimeoutStartSec=2h
Nice=10
EOF

cat > /etc/systemd/system/sigab-loop.timer <<'EOF'
[Unit]
Description=SIGAB loop cada 6h

[Timer]
OnCalendar=*-*-* 00,06,12,18:20:00
RandomizedDelaySec=10m
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now sigab-loop.timer
systemctl list-timers sigab-loop.timer --no-pager | head -3
echo "Loop instalado. Primer ciclo manual de prueba: sudo systemctl start sigab-loop.service && journalctl -fu sigab-loop.service"
