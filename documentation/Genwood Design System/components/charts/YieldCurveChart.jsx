import React from 'react';
const PAD = { t: 16, r: 20, b: 40, l: 52 };
function niceTicks(min, max, n) { const span = max - min || 1; const step0 = span / n; const mag = Math.pow(10, Math.floor(Math.log10(step0))); const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0);
  const out = []; for (let v = Math.floor(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
export function YieldCurveChart({ series = [], height = 320, xLabel = 'Maturity (years)', yLabel = 'Yield (%)', xTicks, yDecimals = 2, showPoints = false, style }) {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(640);
  const [hover, setHover] = React.useState(null);
  React.useEffect(() => { if (!ref.current) return; const ro = new ResizeObserver(e => setW(e[0].contentRect.width)); ro.observe(ref.current); return () => ro.disconnect(); }, []);
  const all = series.flatMap(s => s.points);
  if (!all.length) return <div ref={ref} style={{ height, ...style }} />;
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys); const yp = (y1 - y0) * 0.12 || 0.5; y0 -= yp; y1 += yp;
  const yt = niceTicks(y0, y1, 5); y0 = Math.min(y0, yt[0]); y1 = Math.max(y1, yt[yt.length - 1]);
  const xt = xTicks || niceTicks(x0, x1, 8).filter(v => v >= x0 && v <= x1);
  const iw = Math.max(10, w - PAD.l - PAD.r), ih = height - PAD.t - PAD.b;
  const sx = v => PAD.l + (v - x0) / (x1 - x0 || 1) * iw, sy = v => PAD.t + (1 - (v - y0) / (y1 - y0)) * ih;
  const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(' ');
  const onMove = e => { const r = e.currentTarget.getBoundingClientRect(); const vx = x0 + (e.clientX - r.left - PAD.l) / iw * (x1 - x0);
    const ref0 = series[0].points; let best = ref0[0]; for (const p of ref0) if (Math.abs(p[0] - vx) < Math.abs(best[0] - vx)) best = p; setHover(best[0]); };
  const hv = hover !== null ? series.map(s => ({ s, p: s.points.find(p => p[0] === hover) })).filter(o => o.p) : [];
  const tipLeft = hover !== null ? sx(hover) : 0;
  return <div ref={ref} style={{ position: 'relative', width: '100%', ...style }}>
    <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: 'block', fontFamily: 'var(--font-mono)' }}>
      {yt.map(v => <g key={'y' + v}><line x1={PAD.l} x2={PAD.l + iw} y1={sy(v)} y2={sy(v)} stroke="var(--chart-grid)" />
        <text x={PAD.l - 10} y={sy(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--chart-label)">{v.toFixed(yDecimals > 1 ? 1 : yDecimals)}</text></g>)}
      <line x1={PAD.l} x2={PAD.l + iw} y1={PAD.t + ih} y2={PAD.t + ih} stroke="var(--chart-axis)" />
      {xt.map(v => <g key={'x' + v}><line x1={sx(v)} x2={sx(v)} y1={PAD.t + ih} y2={PAD.t + ih + 4} stroke="var(--chart-axis)" />
        <text x={sx(v)} y={PAD.t + ih + 17} textAnchor="middle" fontSize="11" fill="var(--chart-label)">{v}</text></g>)}
      <text x={PAD.l + iw / 2} y={height - 4} textAnchor="middle" fontSize="11" fill="var(--fg-3)" fontFamily="var(--font-sans)">{xLabel}</text>
      <text transform={'translate(12 ' + (PAD.t + ih / 2) + ') rotate(-90)'} textAnchor="middle" fontSize="11" fill="var(--fg-3)" fontFamily="var(--font-sans)">{yLabel}</text>
      {series.map((s, i) => <path key={s.name} d={path(s.points)} fill="none" stroke={s.color || 'var(--chart-' + (i + 1) + ')'} strokeWidth={s.dashed ? 1.5 : 2} strokeDasharray={s.dashed ? '4 3' : undefined} strokeLinejoin="round" strokeLinecap="round" />)}
      {showPoints && series.map((s, i) => s.points.map(p => <circle key={s.name + p[0]} cx={sx(p[0])} cy={sy(p[1])} r="2.5" fill="#fff" stroke={s.color || 'var(--chart-' + (i + 1) + ')'} strokeWidth="1.5" />))}
      {hover !== null && <g><line x1={sx(hover)} x2={sx(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--gw-stone-400)" strokeDasharray="2 3" />
        {hv.map(({ s, p }) => <circle key={s.name} cx={sx(p[0])} cy={sy(p[1])} r="4" fill="#fff" stroke={s.color || 'var(--chart-' + (series.indexOf(s) + 1) + ')'} strokeWidth="2" />)}</g>}
    </svg>
    {hover !== null && <div style={{ position: 'absolute', top: PAD.t, left: tipLeft + (tipLeft > w - 200 ? -176 : 12), width: 164, pointerEvents: 'none', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)', padding: '8px 10px', font: 'var(--type-caption)' }}>
      <div style={{ color: 'var(--fg-3)', marginBottom: 4 }}>{hover} years</div>
      {hv.map(({ s, p }) => <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 2, background: s.color || 'var(--chart-' + (series.indexOf(s) + 1) + ')' }} /><span style={{ flex: 1, color: 'var(--fg-2)' }}>{s.name}</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-1)' }}>{p[1].toFixed(yDecimals)}</span></div>)}
    </div>}
  </div>;
}
