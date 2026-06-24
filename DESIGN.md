# DESIGN.md — SIGAH Workflow

This is the project-level workflow reference. For the UI design system, see `sigab-frontend/DESIGN.md`.

## Dev Workflow

### Daily coding (from ASUS TUF WSL2)
```bash
# Start Claude Code
cd /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAB && claude

# Deploy to Bluehost VPS (incremental)
bash quick_deploy.sh

# Deploy full (first time / major changes)
bash deploy_to_vps.sh
```

### Stitch → Antigravity → SIGAH
1. Design at stitch.withgoogle.com → import sigab-frontend/DESIGN.md
2. Export screen → Antigravity (Ctrl+E → Stitch MCP → fetch design)
3. Antigravity generates React component → copy to sigab-frontend/src/pages/

## VPS Bluehost
- IP: 129.121.100.147
- SSH: `ssh -i ~/.ssh/sigah_bluehost root@129.121.100.147`
- Health: `curl http://129.121.100.147/api/health`

## Knowledge Base
- Obsidian vault: `C:\Users\djpiy\Documents\Obsidian\SIGAH-KB`
- Graphify report: `GRAPH_REPORT.md` → synced to Obsidian/projects/SIGAH_GRAPH.md
- Session hook: `scripts/save_session_to_obsidian.sh` (auto-runs on Claude Code stop)
