export default function AnesthesiaMachine({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 380 510"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Estación de trabajo de anestesia biomédica"
      role="img"
    >
      {/* ── POLE ── */}
      <rect x="150" y="52" width="16" height="218" rx="3" fill="#E2EAF1" stroke="#C9D6E2" strokeWidth="0.5"/>

      {/* ── MONITOR ARM ── */}
      <rect x="76" y="90" width="77" height="6" rx="3" fill="#CBD5E1"/>

      {/* ═══════════════════════════════ MONITOR GROUP ═══════════════════════════════ */}
      <g id="sigah-monitor-group" style={{ transition: 'filter 0.6s ease' }}>
        {/* Housing */}
        <rect x="36" y="46" width="110" height="88" rx="7" fill="#1E293B" stroke="#334155" strokeWidth="0.5"/>
        {/* Screen bezel */}
        <rect x="46" y="55" width="90" height="60" rx="3" fill="#0D1B2A"/>
        {/* ECG waveform green */}
        <polyline
          points="49,79 56,79 60,67 64,89 68,79 75,79 79,71 81,85 84,77 91,77 95,71 98,82 102,77 110,77 130,77"
          stroke="#22C55E" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
        {/* SpO2 waveform blue */}
        <polyline
          points="49,90 57,90 63,82 69,97 74,88 82,88 87,84 90,93 98,87 108,87 130,87"
          stroke="#60A5FA" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Readings column */}
        <rect x="116" y="57" width="24" height="8" rx="1" fill="#0D2210"/>
        <text x="118" y="63" fontSize="6" fill="#22C55E" fontFamily="monospace">98%</text>
        <rect x="116" y="68" width="24" height="8" rx="1" fill="#1A0A0A"/>
        <text x="118" y="74" fontSize="6" fill="#EF4444" fontFamily="monospace">72</text>
        <rect x="116" y="79" width="24" height="8" rx="1" fill="#0A0D1A"/>
        <text x="118" y="85" fontSize="6" fill="#60A5FA" fontFamily="monospace">16</text>
        {/* Reading labels */}
        <text x="117" y="96" fontSize="4.5" fill="#475569" fontFamily="system-ui">SpO₂</text>
        <text x="117" y="107" fontSize="4.5" fill="#475569" fontFamily="system-ui">BPM</text>
        {/* Monitor base */}
        <rect x="36" y="134" width="110" height="8" rx="2" fill="#1E293B"/>
        <circle cx="91" cy="138" r="2.5" fill="#334155"/>
        <rect x="79" y="140" width="24" height="3" rx="1.5" fill="#334155"/>
      </g>

      {/* ═══════════════════════════════ CIRCUIT GROUP ═══════════════════════════════ */}
      <g id="sigah-circuit-group" style={{ transition: 'filter 0.6s ease' }}>
        {/* Collection chamber */}
        <rect x="28" y="148" width="58" height="82" rx="5" fill="#EFF4F9" stroke="#C9D6E2" strokeWidth="0.5"/>
        <rect x="35" y="155" width="44" height="54" rx="3" fill="white" stroke="#C9D6E2" strokeWidth="0.5"/>
        {/* Liquid level */}
        <rect x="37" y="188" width="40" height="18" rx="2" fill="#FEF3C7"/>
        <rect x="37" y="194" width="40" height="12" rx="1" fill="#FDE68A"/>
        <text x="57" y="203" fontSize="5" fill="#92400E" fontFamily="monospace" textAnchor="middle">0.3L</text>
        {/* Corrugated tube outer */}
        <path d="M 57 148 Q 55 132 57 118 Q 59 104 56 90 Q 53 76 55 62"
          stroke="#C9D6E2" strokeWidth="13" fill="none" strokeLinecap="round"/>
        {/* Corrugated tube segments (white gaps = ridges) */}
        <path d="M 57 148 Q 55 132 57 118 Q 59 104 56 90 Q 53 76 55 62"
          stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray="3.5 3.5"/>
        {/* Breathing bag */}
        <ellipse cx="55" cy="54" rx="22" ry="15" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="0.5"/>
        <ellipse cx="55" cy="54" rx="15" ry="10" fill="#BFDBFE" opacity="0.5"/>
        {/* Connector tube to machine */}
        <path d="M 86 188 Q 100 188 120 190"
          stroke="#C9D6E2" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {/* Bottom nozzle */}
        <rect x="52" y="232" width="30" height="10" rx="4" fill="#94A3B8" stroke="#64748B" strokeWidth="0.5"/>
        <circle cx="67" cy="237" r="4" fill="#64748B"/>
      </g>

      {/* ═══════════════════════════════ VAPORIZER GROUP ═══════════════════════════════ */}
      <g id="sigah-vaporizer-group" style={{ transition: 'filter 0.6s ease' }}>
        <rect x="126" y="58" width="52" height="210" rx="4" fill="#EFF4F9" stroke="#C9D6E2" strokeWidth="0.5"/>
        <rect x="126" y="58" width="52" height="9" rx="2" fill="#00497D"/>
        <text x="152" y="65.5" fontSize="5" fill="white" fontFamily="system-ui" textAnchor="middle" fontWeight="500">VAPORIZADOR</text>

        {/* Yellow knob — Sevoflurane */}
        <circle cx="152" cy="100" r="18" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5"/>
        <circle cx="152" cy="100" r="11" fill="#FCD34D"/>
        <circle cx="152" cy="100" r="4" fill="#D97706"/>
        <line x1="152" y1="91" x2="152" y2="97" stroke="#92400E" strokeWidth="2" strokeLinecap="round"/>
        <text x="152" y="127" fontSize="5.5" fill="#64748B" fontFamily="system-ui" textAnchor="middle">SEV 2.0%</text>

        {/* Purple knob — Isoflurane */}
        <circle cx="152" cy="152" r="18" fill="#7C3AED" stroke="#6D28D9" strokeWidth="0.5"/>
        <circle cx="152" cy="152" r="11" fill="#A78BFA"/>
        <circle cx="152" cy="152" r="4" fill="#4C1D95"/>
        <line x1="152" y1="143" x2="155" y2="149" stroke="#3B0764" strokeWidth="2" strokeLinecap="round"/>
        <text x="152" y="179" fontSize="5.5" fill="#64748B" fontFamily="system-ui" textAnchor="middle">ISO 1.5%</text>

        {/* Level view window */}
        <rect x="131" y="190" width="42" height="68" rx="3" fill="white" stroke="#C9D6E2" strokeWidth="0.5"/>
        <rect x="134" y="193" width="36" height="62" rx="2" fill="#F1F5F9"/>
        <rect x="134" y="225" width="36" height="30" rx="1" fill="#DCFCE7"/>
        <rect x="134" y="225" width="36" height="10" rx="1" fill="#22C55E" opacity="0.7"/>
        <text x="152" y="244" fontSize="5" fill="#15803D" fontFamily="monospace" textAnchor="middle">REM</text>
      </g>

      {/* ═══════════════════════════════ PANEL GROUP ═══════════════════════════════ */}
      <g id="sigah-panel-group" style={{ transition: 'filter 0.6s ease' }}>
        {/* Panel housing */}
        <rect x="181" y="58" width="178" height="210" rx="5" fill="#F8FAFC" stroke="#C9D6E2" strokeWidth="0.5"/>
        <rect x="181" y="58" width="178" height="9" rx="2" fill="#DCEBF7"/>
        <text x="270" y="65.5" fontSize="5" fill="#006CB7" fontFamily="system-ui" fontWeight="500" textAnchor="middle">
          SIGAH ANESTHESIA WORKSTATION
        </text>

        {/* Large round buttons row */}
        {/* Btn A — Yellow */}
        <circle cx="209" cy="100" r="19" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5"/>
        <circle cx="209" cy="100" r="12" fill="#FCD34D"/>
        <circle cx="209" cy="100" r="4.5" fill="#D97706"/>

        {/* Btn B — Yellow */}
        <circle cx="252" cy="100" r="19" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5"/>
        <circle cx="252" cy="100" r="12" fill="#FCD34D"/>
        <circle cx="252" cy="100" r="4.5" fill="#D97706"/>

        {/* Btn C — Blue */}
        <circle cx="295" cy="100" r="19" fill="#006CB7" stroke="#00497D" strokeWidth="0.5"/>
        <circle cx="295" cy="100" r="12" fill="#60A5FA"/>
        <circle cx="295" cy="100" r="4.5" fill="#00497D"/>

        {/* Btn D — Blue */}
        <circle cx="338" cy="100" r="19" fill="#006CB7" stroke="#00497D" strokeWidth="0.5"/>
        <circle cx="338" cy="100" r="12" fill="#60A5FA"/>
        <circle cx="338" cy="100" r="4.5" fill="#00497D"/>

        {/* Square button grid 4×2 */}
        {([
          [193, 132, '#E2EAF1', 'white'],
          [233, 132, '#DCFCE7', '#BBF7D0'],
          [273, 132, '#FEF3C7', '#FDE68A'],
          [313, 132, '#DBEAFE', '#BFDBFE'],
          [193, 162, '#E2EAF1', 'white'],
          [233, 162, '#FEE2E2', '#FECACA'],
          [273, 162, '#E2EAF1', 'white'],
          [313, 162, '#DCFCE7', '#BBF7D0'],
        ] as [number, number, string, string][]).map(([x, y, bg, inner]) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="34" height="24" rx="4" fill={bg} stroke="#C9D6E2" strokeWidth="0.5"/>
            <rect x={x + 3} y={y + 3} width="28" height="14" rx="2" fill={inner}/>
          </g>
        ))}

        {/* Gauges row — 5 dials */}
        {([205, 241, 277, 313, 349] as number[]).map((cx, i) => {
          const hands = [-0.4, 0.6, -0.9, 0.2, -0.6]
          const labels = ['O₂', 'N₂O', 'Air', 'Sev', 'ISO']
          const angle = hands[i]
          const hx = cx + Math.cos(angle - Math.PI / 2) * 10
          const hy = 222 + Math.sin(angle - Math.PI / 2) * 10
          return (
            <g key={cx}>
              <circle cx={cx} cy={222} r="15" fill="white" stroke="#C9D6E2" strokeWidth="0.5"/>
              <circle cx={cx} cy={222} r="11" fill="#F1F5F9" stroke="#E2EAF1" strokeWidth="0.3"/>
              <line x1={cx} y1={222} x2={hx} y2={hy} stroke="#006CB7" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx={cx} cy={222} r="2" fill="#006CB7"/>
              <text x={cx} y={244} fontSize="5.5" fill="#94A3B8" fontFamily="monospace" textAnchor="middle">
                {labels[i]}
              </text>
            </g>
          )
        })}
      </g>

      {/* ── WORK SURFACE ── */}
      <rect x="118" y="270" width="253" height="13" rx="3" fill="#006CB7"/>

      {/* ═══════════════════════════════ CART GROUP ═══════════════════════════════ */}
      <g id="sigah-cart-group">
        {/* Cart body */}
        <rect x="128" y="278" width="243" height="215" rx="7" fill="#F8FAFC" stroke="#C9D6E2" strokeWidth="0.5"/>

        {/* Drawer 1 */}
        <rect x="140" y="296" width="219" height="54" rx="3" fill="white" stroke="#C9D6E2" strokeWidth="0.5"/>
        <rect x="197" y="320" width="105" height="8" rx="4" fill="#E2EAF1" stroke="#C9D6E2" strokeWidth="0.5"/>

        {/* Drawer 2 */}
        <rect x="140" y="356" width="219" height="54" rx="3" fill="white" stroke="#C9D6E2" strokeWidth="0.5"/>
        <rect x="197" y="380" width="105" height="8" rx="4" fill="#E2EAF1" stroke="#C9D6E2" strokeWidth="0.5"/>

        {/* Drawer 3 */}
        <rect x="140" y="416" width="219" height="54" rx="3" fill="white" stroke="#C9D6E2" strokeWidth="0.5"/>
        <rect x="197" y="440" width="105" height="8" rx="4" fill="#E2EAF1" stroke="#C9D6E2" strokeWidth="0.5"/>

        {/* Wheels — 4 casters */}
        {([158, 218, 283, 353] as number[]).map(cx => (
          <g key={cx}>
            <circle cx={cx} cy={500} r="13" fill="#94A3B8" stroke="#64748B" strokeWidth="0.5"/>
            <circle cx={cx} cy={500} r="7" fill="#64748B"/>
            <circle cx={cx} cy={500} r="3" fill="#94A3B8"/>
          </g>
        ))}
      </g>
    </svg>
  )
}
