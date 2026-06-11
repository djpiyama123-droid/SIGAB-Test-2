import { useCallback } from 'react';

export function usePrintFormato() {
  const print = useCallback(() => {
    const el = document.getElementById('formato-print-root');
    if (!el) { window.print(); return; }

    const styles = Array.from(document.styleSheets)
      .flatMap(sheet => {
        try { return Array.from(sheet.cssRules).map(r => r.cssText); }
        catch { return []; }
      })
      .join('\n');

    const printWin = window.open('', '_blank', 'width=960,height=800');
    if (!printWin) { window.print(); return; }

    printWin.document.write(
      `<!DOCTYPE html><html lang="es"><head>` +
      `<meta charset="utf-8">` +
      `<style>${styles}</style>` +
      `<style>@media print { body > * { visibility: visible !important; } }</style>` +
      `</head><body style="margin:0;background:white;">` +
      el.outerHTML +
      `</body></html>`
    );
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 700);
  }, []);

  return { print };
}
