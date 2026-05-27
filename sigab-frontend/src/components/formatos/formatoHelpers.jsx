export function CB({ checked, label, t }) {
  return (
    <span style={{ color: checked ? t.check : t.cell.color, marginRight: 14, fontSize: 13, whiteSpace: 'nowrap' }}>
      <span style={{ color: checked ? t.check : t.cell.color, fontSize: 15 }}>{checked ? '☑' : '☐'}</span>
      {' '}{label}
    </span>
  );
}

export function SecHeader({ title, t, colSpan = 10 }) {
  return (
    <tr>
      <td colSpan={colSpan} style={t.sectionTitle}>{title}</td>
    </tr>
  );
}
