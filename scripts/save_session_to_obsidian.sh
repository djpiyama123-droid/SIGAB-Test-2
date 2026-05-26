#!/bin/bash
OBSIDIAN_DIR="/mnt/c/Users/djpiy/Documents/Obsidian/SIGAH-KB/sessions"
DATE=$(date +"%Y-%m-%d_%H-%M")
SESSION_FILE="$OBSIDIAN_DIR/session_${DATE}.md"

mkdir -p "$OBSIDIAN_DIR"
cat > "$SESSION_FILE" << EOF
# Sesión SIGAH — $DATE

## Rama activa
$(git -C /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAH branch --show-current 2>/dev/null)

## Últimos commits
$(git -C /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAH log --oneline -5 2>/dev/null)

## Archivos modificados
$(git -C /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAH status --short 2>/dev/null | head -20)

## Estado VPS
$(curl -s --connect-timeout 5 http://129.121.100.147:8000/health 2>/dev/null || echo "VPS no disponible")
EOF

echo "Sesión guardada en: $SESSION_FILE"
