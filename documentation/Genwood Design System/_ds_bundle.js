/* @ds-bundle: {"format":4,"namespace":"GenwoodDesignSystem_cb120d","components":[{"name":"YieldCurveChart","sourcePath":"components/charts/YieldCurveChart.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Stat","sourcePath":"components/display/Card.jsx"},{"name":"Table","sourcePath":"components/display/Table.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"RadioGroup","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"SideNav","sourcePath":"components/navigation/SideNav.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/charts/YieldCurveChart.jsx":"27e237d52015","components/core/Button.jsx":"a510fe75e0d1","components/core/Icon.jsx":"ecbcc80b7508","components/core/IconButton.jsx":"ce28cfa85cfb","components/display/Badge.jsx":"a6e43342c13d","components/display/Card.jsx":"45ba856236e9","components/display/Table.jsx":"558ed0c7c4e2","components/display/Tag.jsx":"c265fa260c7a","components/feedback/Dialog.jsx":"216a79515dc0","components/feedback/Toast.jsx":"11e546c8d58f","components/feedback/Tooltip.jsx":"1ea70c46a725","components/forms/Checkbox.jsx":"5aa4533bb443","components/forms/Input.jsx":"6ee5dd254cc8","components/forms/Radio.jsx":"734eb4970811","components/forms/Select.jsx":"cd438e06d506","components/forms/Switch.jsx":"da4b00c412d8","components/navigation/SideNav.jsx":"6638b3f98b1c","components/navigation/Tabs.jsx":"8df6f176c19c","ui_kits/genwood-app/AppShell.jsx":"850fef77cd00","ui_kits/genwood-app/CurvesScreen.jsx":"edb8e7b582c2","ui_kits/genwood-app/DataScreen.jsx":"890d83fc2efc","ui_kits/genwood-app/FileDetailScreen.jsx":"49482bfd5282","ui_kits/genwood-app/FileLogScreen.jsx":"8c7a1a151c82","ui_kits/genwood-app/ImportDialog.jsx":"4bdc9b5a78c8","ui_kits/genwood-app/data.js":"1e3c33fc3ac1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GenwoodDesignSystem_cb120d = window.GenwoodDesignSystem_cb120d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/charts/YieldCurveChart.jsx
try { (() => {
const PAD = {
  t: 16,
  r: 20,
  b: 40,
  l: 52
};
function niceTicks(min, max, n) {
  const span = max - min || 1;
  const step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0);
  const out = [];
  for (let v = Math.floor(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}
function YieldCurveChart({
  series = [],
  height = 320,
  xLabel = 'Maturity (years)',
  yLabel = 'Yield (%)',
  xTicks,
  yDecimals = 2,
  showPoints = false,
  style
}) {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(640);
  const [hover, setHover] = React.useState(null);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(e => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const all = series.flatMap(s => s.points);
  if (!all.length) return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      height,
      ...style
    }
  });
  const xs = all.map(p => p[0]),
    ys = all.map(p => p[1]);
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs);
  let y0 = Math.min(...ys),
    y1 = Math.max(...ys);
  const yp = (y1 - y0) * 0.12 || 0.5;
  y0 -= yp;
  y1 += yp;
  const yt = niceTicks(y0, y1, 5);
  y0 = Math.min(y0, yt[0]);
  y1 = Math.max(y1, yt[yt.length - 1]);
  const xt = xTicks || niceTicks(x0, x1, 8).filter(v => v >= x0 && v <= x1);
  const iw = Math.max(10, w - PAD.l - PAD.r),
    ih = height - PAD.t - PAD.b;
  const sx = v => PAD.l + (v - x0) / (x1 - x0 || 1) * iw,
    sy = v => PAD.t + (1 - (v - y0) / (y1 - y0)) * ih;
  const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(' ');
  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = x0 + (e.clientX - r.left - PAD.l) / iw * (x1 - x0);
    const ref0 = series[0].points;
    let best = ref0[0];
    for (const p of ref0) if (Math.abs(p[0] - vx) < Math.abs(best[0] - vx)) best = p;
    setHover(best[0]);
  };
  const hv = hover !== null ? series.map(s => ({
    s,
    p: s.points.find(p => p[0] === hover)
  })).filter(o => o.p) : [];
  const tipLeft = hover !== null ? sx(hover) : 0;
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'relative',
      width: '100%',
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: w,
    height: height,
    onMouseMove: onMove,
    onMouseLeave: () => setHover(null),
    style: {
      display: 'block',
      fontFamily: 'var(--font-mono)'
    }
  }, yt.map(v => /*#__PURE__*/React.createElement("g", {
    key: 'y' + v
  }, /*#__PURE__*/React.createElement("line", {
    x1: PAD.l,
    x2: PAD.l + iw,
    y1: sy(v),
    y2: sy(v),
    stroke: "var(--chart-grid)"
  }), /*#__PURE__*/React.createElement("text", {
    x: PAD.l - 10,
    y: sy(v),
    dy: "0.32em",
    textAnchor: "end",
    fontSize: "11",
    fill: "var(--chart-label)"
  }, v.toFixed(yDecimals > 1 ? 1 : yDecimals)))), /*#__PURE__*/React.createElement("line", {
    x1: PAD.l,
    x2: PAD.l + iw,
    y1: PAD.t + ih,
    y2: PAD.t + ih,
    stroke: "var(--chart-axis)"
  }), xt.map(v => /*#__PURE__*/React.createElement("g", {
    key: 'x' + v
  }, /*#__PURE__*/React.createElement("line", {
    x1: sx(v),
    x2: sx(v),
    y1: PAD.t + ih,
    y2: PAD.t + ih + 4,
    stroke: "var(--chart-axis)"
  }), /*#__PURE__*/React.createElement("text", {
    x: sx(v),
    y: PAD.t + ih + 17,
    textAnchor: "middle",
    fontSize: "11",
    fill: "var(--chart-label)"
  }, v))), /*#__PURE__*/React.createElement("text", {
    x: PAD.l + iw / 2,
    y: height - 4,
    textAnchor: "middle",
    fontSize: "11",
    fill: "var(--fg-3)",
    fontFamily: "var(--font-sans)"
  }, xLabel), /*#__PURE__*/React.createElement("text", {
    transform: 'translate(12 ' + (PAD.t + ih / 2) + ') rotate(-90)',
    textAnchor: "middle",
    fontSize: "11",
    fill: "var(--fg-3)",
    fontFamily: "var(--font-sans)"
  }, yLabel), series.map((s, i) => /*#__PURE__*/React.createElement("path", {
    key: s.name,
    d: path(s.points),
    fill: "none",
    stroke: s.color || 'var(--chart-' + (i + 1) + ')',
    strokeWidth: s.dashed ? 1.5 : 2,
    strokeDasharray: s.dashed ? '4 3' : undefined,
    strokeLinejoin: "round",
    strokeLinecap: "round"
  })), showPoints && series.map((s, i) => s.points.map(p => /*#__PURE__*/React.createElement("circle", {
    key: s.name + p[0],
    cx: sx(p[0]),
    cy: sy(p[1]),
    r: "2.5",
    fill: "#fff",
    stroke: s.color || 'var(--chart-' + (i + 1) + ')',
    strokeWidth: "1.5"
  }))), hover !== null && /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: sx(hover),
    x2: sx(hover),
    y1: PAD.t,
    y2: PAD.t + ih,
    stroke: "var(--gw-stone-400)",
    strokeDasharray: "2 3"
  }), hv.map(({
    s,
    p
  }) => /*#__PURE__*/React.createElement("circle", {
    key: s.name,
    cx: sx(p[0]),
    cy: sy(p[1]),
    r: "4",
    fill: "#fff",
    stroke: s.color || 'var(--chart-' + (series.indexOf(s) + 1) + ')',
    strokeWidth: "2"
  })))), hover !== null && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: PAD.t,
      left: tipLeft + (tipLeft > w - 200 ? -176 : 12),
      width: 164,
      pointerEvents: 'none',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-md)',
      padding: '8px 10px',
      font: 'var(--type-caption)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--fg-3)',
      marginBottom: 4
    }
  }, hover, " years"), hv.map(({
    s,
    p
  }) => /*#__PURE__*/React.createElement("div", {
    key: s.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 2,
      background: s.color || 'var(--chart-' + (series.indexOf(s) + 1) + ')'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      color: 'var(--fg-2)'
    }
  }, s.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--fg-1)'
    }
  }, p[1].toFixed(yDecimals))))));
}
Object.assign(__ds_scope, { YieldCurveChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/charts/YieldCurveChart.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
const LUCIDE = 'https://unpkg.com/lucide-static@0.469.0/icons/';
function Icon({
  name,
  size = 16,
  color = 'currentColor',
  style,
  title
}) {
  const url = 'url(' + LUCIDE + name + '.svg)';
  return /*#__PURE__*/React.createElement("span", {
    role: title ? 'img' : undefined,
    "aria-label": title,
    "aria-hidden": title ? undefined : true,
    style: {
      display: 'inline-block',
      flex: 'none',
      width: size,
      height: size,
      background: color,
      WebkitMask: url + ' center/contain no-repeat',
      mask: url + ' center/contain no-repeat',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const SIZES = {
  sm: {
    h: 28,
    px: 10,
    fs: 12,
    ic: 14
  },
  md: {
    h: 36,
    px: 14,
    fs: 13,
    ic: 16
  },
  lg: {
    h: 44,
    px: 18,
    fs: 14,
    ic: 18
  }
};
const VARIANTS = {
  primary: {
    bg: 'var(--action-primary)',
    hov: 'var(--action-primary-hover)',
    fg: 'var(--fg-on-brand)',
    bd: 'var(--action-primary)'
  },
  secondary: {
    bg: 'var(--action-secondary)',
    hov: 'var(--action-secondary-hover)',
    fg: 'var(--fg-1)',
    bd: 'var(--border-strong)'
  },
  ghost: {
    bg: 'transparent',
    hov: 'var(--surface-hover)',
    fg: 'var(--fg-brand)',
    bd: 'transparent'
  },
  danger: {
    bg: 'var(--gw-clay-600)',
    hov: 'var(--gw-clay-700)',
    fg: '#fff',
    bd: 'var(--gw-clay-600)'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  fullWidth,
  onClick,
  type = 'button',
  children,
  style
}) {
  const [hov, setHov] = React.useState(false);
  const [down, setDown] = React.useState(false);
  const s = SIZES[size] || SIZES.md,
    v = VARIANTS[variant] || VARIANTS.primary;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => {
      setHov(false);
      setDown(false);
    },
    onMouseDown: () => setDown(true),
    onMouseUp: () => setDown(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: s.h,
      padding: '0 ' + s.px + 'px',
      width: fullWidth ? '100%' : undefined,
      font: 'var(--weight-medium) ' + s.fs + 'px/1 var(--font-sans)',
      color: v.fg,
      background: hov && !disabled ? v.hov : v.bg,
      border: '1px solid ' + v.bd,
      borderRadius: 'var(--radius-sm)',
      boxShadow: variant === 'secondary' ? 'var(--shadow-xs)' : 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transform: down && !disabled ? 'translateY(1px)' : 'none',
      whiteSpace: 'nowrap',
      transition: 'background var(--duration-fast) var(--ease-standard)',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.ic
  }), children !== undefined && children !== null && /*#__PURE__*/React.createElement("span", null, children), iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.ic
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
const SZ = {
  sm: 28,
  md: 36,
  lg: 44
};
function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  onClick,
  disabled,
  active,
  style
}) {
  const [hov, setHov] = React.useState(false);
  const d = SZ[size] || 36;
  const bg = variant === 'primary' ? hov ? 'var(--action-primary-hover)' : 'var(--action-primary)' : variant === 'secondary' ? hov ? 'var(--action-secondary-hover)' : 'var(--action-secondary)' : variant === 'onBrand' ? hov || active ? 'rgba(255,255,255,.1)' : 'transparent' : hov || active ? 'var(--surface-hover)' : 'transparent';
  const fg = variant === 'primary' || variant === 'onBrand' ? '#fff' : active ? 'var(--fg-brand)' : 'var(--fg-2)';
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label,
    title: label,
    onClick: onClick,
    disabled: disabled,
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    style: {
      width: d,
      height: d,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      color: fg,
      background: bg,
      border: variant === 'secondary' ? '1px solid var(--border-strong)' : '1px solid transparent',
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--duration-fast)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function Badge({
  tone = 'neutral',
  dot = true,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 22,
      padding: '0 8px',
      borderRadius: 'var(--radius-full)',
      whiteSpace: 'nowrap',
      font: 'var(--weight-medium) 12px/1 var(--font-sans)',
      color: 'var(--status-' + tone + '-fg)',
      background: 'var(--status-' + tone + '-bg)',
      border: '1px solid var(--status-' + tone + '-border)',
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function Card({
  title,
  subtitle,
  actions,
  footer,
  padding = 20,
  flush,
  children,
  style
}) {
  const head = title || actions;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-xs)',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      ...style
    }
  }, head && /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 12,
      padding: '14px ' + padding + 'px',
      borderBottom: flush || children ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 200px',
      minWidth: 200
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: 'var(--type-h3)',
      color: 'var(--fg-1)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--fg-3)',
      marginTop: 2
    }
  }, subtitle)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center'
    }
  }, actions)), children && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: flush ? 0 : padding,
      flex: 1,
      minWidth: 0
    }
  }, children), footer && /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: '12px ' + padding + 'px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--surface-page)',
      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
      font: 'var(--type-caption)',
      color: 'var(--fg-3)'
    }
  }, footer));
}
function Stat({
  label,
  value,
  delta,
  unit,
  tone
}) {
  const col = tone === 'up' ? 'var(--status-success-fg)' : tone === 'down' ? 'var(--status-danger-fg)' : 'var(--fg-3)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-overline)',
      letterSpacing: 'var(--tracking-caps)',
      textTransform: 'uppercase',
      color: 'var(--fg-3)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-data-lg)',
      color: 'var(--fg-brand)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, value, unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--fg-3)',
      marginLeft: 2
    }
  }, unit)), delta && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-data)',
      fontSize: 12,
      color: col
    }
  }, delta));
}
Object.assign(__ds_scope, { Card, Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Table.jsx
try { (() => {
function Table({
  columns = [],
  rows = [],
  rowKey = 'id',
  onRowClick,
  selectedKey,
  dense,
  stickyHeader,
  maxHeight,
  style
}) {
  const [hov, setHov] = React.useState(null);
  const pad = dense ? '7px 12px' : '11px 16px';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'auto',
      maxHeight,
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: 0,
      font: 'var(--type-body)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align || 'left',
      padding: dense ? '8px 12px' : '10px 16px',
      width: c.width,
      whiteSpace: 'nowrap',
      font: 'var(--type-overline)',
      letterSpacing: 'var(--tracking-wide)',
      textTransform: 'uppercase',
      color: 'var(--fg-3)',
      background: 'var(--surface-sunken)',
      borderBottom: '1px solid var(--border-default)',
      position: stickyHeader ? 'sticky' : undefined,
      top: 0,
      zIndex: 1
    }
  }, c.header)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => {
    const k = r[rowKey] !== undefined ? r[rowKey] : i;
    const sel = selectedKey === k;
    return /*#__PURE__*/React.createElement("tr", {
      key: k,
      onClick: onRowClick ? () => onRowClick(r) : undefined,
      onMouseEnter: () => setHov(k),
      onMouseLeave: () => setHov(null),
      style: {
        cursor: onRowClick ? 'pointer' : 'default',
        background: sel ? 'var(--surface-selected)' : hov === k && onRowClick ? 'var(--surface-page)' : 'var(--surface-card)'
      }
    }, columns.map((c, ci) => /*#__PURE__*/React.createElement("td", {
      key: c.key,
      style: {
        padding: pad,
        textAlign: c.align || 'left',
        borderBottom: '1px solid var(--border-subtle)',
        color: c.muted ? 'var(--fg-3)' : 'var(--fg-1)',
        whiteSpace: c.wrap ? 'normal' : 'nowrap',
        fontFamily: c.mono ? 'var(--font-mono)' : undefined,
        fontSize: c.mono ? 12.5 : undefined,
        fontVariantNumeric: 'tabular-nums',
        boxShadow: sel && ci === 0 ? 'inset 2px 0 0 var(--action-primary)' : undefined
      }
    }, c.render ? c.render(r[c.key], r) : r[c.key])));
  }))));
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Table.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
function Tag({
  children,
  selected,
  onClick,
  onRemove,
  color,
  style
}) {
  const [hov, setHov] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 26,
      padding: '0 10px',
      borderRadius: 'var(--radius-sm)',
      cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap',
      font: 'var(--type-label)',
      color: selected ? 'var(--fg-brand)' : 'var(--fg-2)',
      background: selected ? 'var(--surface-selected)' : hov && onClick ? 'var(--surface-hover)' : 'var(--surface-card)',
      border: '1px solid ' + (selected ? 'var(--gw-forest-300)' : 'var(--border-default)'),
      transition: 'background var(--duration-fast)',
      ...style
    }
  }, color && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 2,
      background: color,
      borderRadius: 1
    }
  }), children, onRemove && /*#__PURE__*/React.createElement("span", {
    role: "button",
    "aria-label": "Remove",
    onClick: e => {
      e.stopPropagation();
      onRemove();
    },
    style: {
      display: 'inline-flex',
      cursor: 'pointer',
      marginRight: -4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 12
  })));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  width = 480
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'var(--surface-overlay)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: width,
      maxHeight: '100%',
      overflow: 'auto',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '20px 20px 0 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-h2)',
      fontSize: 18,
      color: 'var(--fg-1)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      font: 'var(--type-body)',
      color: 'var(--fg-2)'
    }
  }, description)), onClose && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close",
    size: "sm",
    onClick: onClose
  })), children && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 24px'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      padding: '14px 24px',
      borderTop: '1px solid var(--border-subtle)',
      marginTop: children ? 0 : 16
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const ICONS = {
  success: 'circle-check',
  warning: 'triangle-alert',
  danger: 'circle-x',
  info: 'info',
  neutral: 'bell'
};
function Toast({
  tone = 'info',
  title,
  message,
  onClose,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      width: 360,
      maxWidth: '100%',
      padding: '12px 14px',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-md)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: ICONS[tone],
    size: 18,
    color: 'var(--status-' + tone + '-fg)',
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      fontSize: 13,
      color: 'var(--fg-1)'
    }
  }, title), message && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--fg-2)',
      marginTop: 2
    }
  }, message), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, action)), onClose && /*#__PURE__*/React.createElement("button", {
    "aria-label": "Dismiss",
    onClick: onClose,
    style: {
      border: 0,
      background: 'transparent',
      padding: 2,
      cursor: 'pointer',
      color: 'var(--fg-3)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  content,
  children,
  placement = 'top'
}) {
  const [show, setShow] = React.useState(false);
  const pos = placement === 'bottom' ? {
    top: '100%',
    marginTop: 6
  } : {
    bottom: '100%',
    marginBottom: 6
  };
  return /*#__PURE__*/React.createElement("span", {
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false),
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      ...pos,
      zIndex: 50,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      padding: '6px 8px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--gw-forest-900)',
      color: '#fff',
      font: 'var(--type-caption)',
      boxShadow: 'var(--shadow-md)'
    }
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked,
  defaultChecked = false,
  indeterminate,
  onChange,
  disabled
}) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked !== undefined ? checked : inner;
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInner(!on);
    onChange && onChange(!on);
  };
  const filled = on || indeterminate;
  return /*#__PURE__*/React.createElement("label", {
    onClick: toggle,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      font: 'var(--type-body)',
      color: 'var(--fg-1)',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "checkbox",
    "aria-checked": indeterminate ? 'mixed' : on,
    style: {
      width: 16,
      height: 16,
      flex: 'none',
      borderRadius: 'var(--radius-xs)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: filled ? 'var(--action-primary)' : 'var(--surface-card)',
      border: '1px solid ' + (filled ? 'var(--action-primary)' : 'var(--border-strong)'),
      transition: 'background var(--duration-fast)'
    }
  }, indeterminate ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "minus",
    size: 12,
    color: "#fff"
  }) : on ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12,
    color: "#fff"
  }) : null), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Field({
  label,
  hint,
  error,
  children,
  htmlFor
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      font: 'var(--type-label)',
      color: 'var(--fg-2)'
    }
  }, label), children, (error || hint) && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: error ? 'var(--status-danger-fg)' : 'var(--fg-3)'
    }
  }, error || hint));
}
function Input({
  label,
  hint,
  error,
  icon,
  suffix,
  size = 'md',
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled,
  type = 'text',
  mono,
  id,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const bd = error ? 'var(--status-danger-fg)' : focus ? 'var(--border-focus)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement(Field, {
    label: label,
    hint: hint,
    error: error,
    htmlFor: id
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: h,
      padding: '0 12px',
      background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
      border: '1px solid ' + bd,
      borderRadius: 'var(--radius-sm)',
      boxShadow: focus ? '0 0 0 3px var(--gw-forest-100)' : 'none',
      transition: 'box-shadow var(--duration-fast), border-color var(--duration-fast)',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    color: "var(--fg-3)"
  }), /*#__PURE__*/React.createElement("input", {
    id: id,
    type: type,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 0,
      background: 'transparent',
      color: 'var(--fg-1)',
      font: mono ? 'var(--type-data)' : 'var(--type-body)',
      fontSize: size === 'sm' ? 12 : 14
    }
  }), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--fg-3)'
    }
  }, suffix)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function Radio({
  label,
  checked,
  onChange,
  disabled,
  name,
  value
}) {
  return /*#__PURE__*/React.createElement("label", {
    onClick: () => !disabled && onChange && onChange(value),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      font: 'var(--type-body)',
      color: 'var(--fg-1)',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "radio",
    "aria-checked": !!checked,
    "data-name": name,
    style: {
      width: 16,
      height: 16,
      flex: 'none',
      borderRadius: '50%',
      background: 'var(--surface-card)',
      border: (checked ? 5 : 1) + 'px solid ' + (checked ? 'var(--action-primary)' : 'var(--border-strong)'),
      transition: 'border var(--duration-fast)'
    }
  }), label);
}
function RadioGroup({
  options = [],
  value,
  onChange,
  name,
  direction = 'column'
}) {
  const [inner, setInner] = React.useState(value !== undefined ? value : options[0] && (options[0].value || options[0]));
  const cur = value !== undefined ? value : inner;
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  return /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    style: {
      display: 'flex',
      flexDirection: direction,
      gap: direction === 'row' ? 20 : 10
    }
  }, opts.map(o => /*#__PURE__*/React.createElement(Radio, {
    key: o.value,
    name: name,
    value: o.value,
    label: o.label,
    disabled: o.disabled,
    checked: cur === o.value,
    onChange: v => {
      setInner(v);
      onChange && onChange(v);
    }
  })));
}
Object.assign(__ds_scope, { Radio, RadioGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Field({
  label,
  hint,
  error,
  children,
  htmlFor
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      font: 'var(--type-label)',
      color: 'var(--fg-2)'
    }
  }, label), children, (error || hint) && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: error ? 'var(--status-danger-fg)' : 'var(--fg-3)'
    }
  }, error || hint));
}
function Select({
  label,
  hint,
  error,
  options = [],
  value,
  defaultValue,
  onChange,
  disabled,
  size = 'md',
  id,
  style
}) {
  const h = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  return /*#__PURE__*/React.createElement(Field, {
    label: label,
    hint: hint,
    error: error,
    htmlFor: id
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      ...style
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: id,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      height: h,
      padding: '0 34px 0 12px',
      font: 'var(--type-body)',
      fontSize: size === 'sm' ? 12 : 14,
      color: 'var(--fg-1)',
      background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
      border: '1px solid ' + (error ? 'var(--status-danger-fg)' : 'var(--border-strong)'),
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      outlineColor: 'var(--border-focus)'
    }
  }, opts.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 16,
    color: "var(--fg-3)",
    style: {
      position: 'absolute',
      right: 10,
      top: '50%',
      marginTop: -8,
      pointerEvents: 'none'
    }
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  label,
  checked,
  defaultChecked = false,
  onChange,
  disabled
}) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked !== undefined ? checked : inner;
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInner(!on);
    onChange && onChange(!on);
  };
  return /*#__PURE__*/React.createElement("label", {
    onClick: toggle,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      font: 'var(--type-body)',
      color: 'var(--fg-1)',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "switch",
    "aria-checked": on,
    style: {
      position: 'relative',
      width: 32,
      height: 18,
      flex: 'none',
      borderRadius: 999,
      background: on ? 'var(--action-primary)' : 'var(--gw-stone-300)',
      transition: 'background var(--duration-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: on ? 16 : 2,
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left var(--duration-base) var(--ease-standard)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SideNav.jsx
try { (() => {
function SideNav({
  items = [],
  value,
  onChange,
  footer,
  style
}) {
  const [hov, setHov] = React.useState(null);
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      width: 'var(--sidebar-w)',
      flex: 'none',
      background: 'var(--surface-card)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
      gap: 2,
      ...style
    }
  }, items.map(it => it.section ? /*#__PURE__*/React.createElement("div", {
    key: it.section,
    style: {
      font: 'var(--type-overline)',
      letterSpacing: 'var(--tracking-caps)',
      textTransform: 'uppercase',
      color: 'var(--fg-3)',
      padding: '16px 10px 6px'
    }
  }, it.section) : /*#__PURE__*/React.createElement("button", {
    key: it.id,
    onClick: () => onChange && onChange(it.id),
    onMouseEnter: () => setHov(it.id),
    onMouseLeave: () => setHov(null),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 36,
      padding: '0 10px',
      border: 0,
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      textAlign: 'left',
      font: 'var(--type-label)',
      fontSize: 13,
      color: value === it.id ? 'var(--fg-brand)' : 'var(--fg-2)',
      background: value === it.id ? 'var(--surface-selected)' : hov === it.id ? 'var(--surface-hover)' : 'transparent',
      fontWeight: value === it.id ? 600 : 500
    }
  }, it.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: it.icon,
    size: 18,
    color: value === it.id ? 'var(--fg-brand)' : 'var(--fg-3)'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, it.label), it.count !== undefined && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-data)',
      fontSize: 11,
      color: 'var(--fg-3)'
    }
  }, it.count))), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 12,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, footer));
}
Object.assign(__ds_scope, { SideNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SideNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  variant = 'line',
  style
}) {
  const [inner, setInner] = React.useState(defaultValue !== undefined ? defaultValue : tabs[0] && tabs[0].id);
  const cur = value !== undefined ? value : inner;
  const pick = id => {
    setInner(id);
    onChange && onChange(id);
  };
  const seg = variant === 'segmented';
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      gap: seg ? 2 : 24,
      borderBottom: seg ? 'none' : '1px solid var(--border-default)',
      background: seg ? 'var(--surface-sunken)' : 'transparent',
      padding: seg ? 3 : 0,
      borderRadius: seg ? 'var(--radius-sm)' : 0,
      width: seg ? 'fit-content' : undefined,
      ...style
    }
  }, tabs.map(t => {
    const on = t.id === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      role: "tab",
      "aria-selected": on,
      onClick: () => pick(t.id),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: 0,
        cursor: 'pointer',
        font: 'var(--type-label)',
        fontSize: 13,
        whiteSpace: 'nowrap',
        flex: 'none',
        padding: seg ? '6px 12px' : '10px 0',
        marginBottom: seg ? 0 : -1,
        borderRadius: seg ? 3 : 0,
        color: on ? 'var(--fg-brand)' : 'var(--fg-3)',
        background: seg ? on ? 'var(--surface-card)' : 'transparent' : 'transparent',
        boxShadow: seg && on ? 'var(--shadow-sm)' : 'none',
        borderBottom: seg ? 0 : '2px solid ' + (on ? 'var(--action-primary)' : 'transparent'),
        transition: 'color var(--duration-fast)'
      }
    }, t.label, t.count !== undefined && /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--type-data)',
        fontSize: 11,
        padding: '1px 6px',
        borderRadius: 999,
        background: on ? 'var(--surface-selected)' : 'var(--surface-sunken)',
        color: 'inherit'
      }
    }, t.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/genwood-app/AppShell.jsx
try { (() => {
const {
  Icon,
  IconButton,
  SideNav
} = window.GenwoodDesignSystem_cb120d;
function AppHeader({
  onHome
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--header-h)',
      background: 'var(--surface-brand)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px 0 20px',
      gap: 16,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/genwood-logo.png",
    alt: "Genwood",
    onClick: onHome,
    style: {
      height: 34,
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 24,
      background: 'rgba(255,255,255,.18)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      fontSize: 13,
      color: 'var(--fg-on-brand-muted)'
    }
  }, "Market data \xB7 Yield curves"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 32,
      padding: '0 10px',
      borderRadius: 4,
      background: 'rgba(255,255,255,.08)',
      color: 'var(--fg-on-brand-muted)',
      font: 'var(--type-caption)',
      width: 240
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), " Search files and dates"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    label: "Notifications",
    variant: "onBrand"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: 'var(--gw-forest-600)',
      color: '#fff',
      font: 'var(--weight-semibold) 12px/30px var(--font-sans)',
      textAlign: 'center'
    }
  }, "AM"));
}
function AppShell({
  screen,
  onNav,
  children,
  failed
}) {
  const items = [{
    section: 'Imports'
  }, {
    id: 'log',
    label: 'File log',
    icon: 'history',
    count: failed
  }, {
    section: 'Market data'
  }, {
    id: 'data',
    label: 'Curve data',
    icon: 'table'
  }, {
    id: 'curves',
    label: 'Yield curves',
    icon: 'chart-line'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh'
    }
  }, /*#__PURE__*/React.createElement(AppHeader, {
    onHome: () => onNav('log')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flex: 1,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(SideNav, {
    value: screen === 'file' ? 'log' : screen,
    onChange: onNav,
    items: items,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '4px 10px',
        font: 'var(--type-caption)',
        color: 'var(--fg-3)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "landmark",
      size: 14,
      style: {
        marginTop: 2
      }
    }), /*#__PURE__*/React.createElement("span", null, "Source: Bank of England", /*#__PURE__*/React.createElement("br", null), "Next import 07:30 tomorrow"))
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      overflow: 'auto',
      background: 'var(--surface-page)'
    }
  }, children)));
}
function PageHeader({
  title,
  subtitle,
  actions,
  crumb
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, crumb, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-h1)',
      color: 'var(--fg-1)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--fg-3)',
      marginTop: 4
    }
  }, subtitle)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, actions));
}
Object.assign(window, {
  AppShell,
  AppHeader,
  PageHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/genwood-app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/genwood-app/CurvesScreen.jsx
try { (() => {
const {
  Card,
  Stat,
  Tag,
  Select,
  Tabs,
  Button,
  Checkbox,
  Table,
  YieldCurveChart
} = window.GenwoodDesignSystem_cb120d;
function CurvesScreen({
  initialKind = 'nominal'
}) {
  const D = window.GW_DATA;
  const [kind, setKind] = React.useState(initialKind);
  const [dates, setDates] = React.useState([D.DATES[0], D.DATES[5]]);
  const [measure, setMeasure] = React.useState('spot');
  const [points, setPoints] = React.useState(false);
  const toggle = d => setDates(ds => ds.includes(d) ? ds.length > 1 ? ds.filter(x => x !== d) : ds : ds.concat(d).slice(-5));
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  const series = dates.map((d, i) => ({
    name: d,
    points: D.curves[kind].find(c => c.date === d).points,
    color: colors[i]
  }));
  const pick = (d, m) => D.curves[kind].find(c => c.date === d).points.find(p => p[0] === m)[1];
  const base = dates[0];
  const tenors = [2, 5, 10, 30];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 32px',
      maxWidth: 'var(--content-max)'
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Yield curves",
    subtitle: "Compare Bank of England curves across valuation dates.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Select, {
      value: kind,
      onChange: e => setKind(e.target.value),
      options: [{
        value: 'nominal',
        label: 'Nominal'
      }, {
        value: 'real',
        label: 'Real'
      }, {
        value: 'inflation',
        label: 'Implied inflation'
      }],
      style: {
        width: 170
      }
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      icon: "download"
    }, "Export"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
      gap: 16,
      marginBottom: 20
    }
  }, tenors.map(t => {
    const v = pick(base, t),
      p = pick(D.DATES[1], t),
      bp = ((v - p) * 100).toFixed(1);
    return /*#__PURE__*/React.createElement(Card, {
      key: t,
      padding: 16
    }, /*#__PURE__*/React.createElement(Stat, {
      label: t + 'Y ' + measure,
      value: v.toFixed(3),
      unit: "%",
      delta: (bp > 0 ? '+' : '') + bp + ' bp on day',
      tone: bp > 0 ? 'up' : bp < 0 ? 'down' : 'neutral'
    }));
  })), /*#__PURE__*/React.createElement(Card, {
    title: D.KINDS[kind] + ' curve',
    subtitle: 'Continuously compounded, % per annum · ' + dates.length + ' date' + (dates.length > 1 ? 's' : ''),
    flush: true,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Checkbox, {
      label: "Show points",
      checked: points,
      onChange: setPoints
    }), /*#__PURE__*/React.createElement(Tabs, {
      variant: "segmented",
      value: measure,
      onChange: setMeasure,
      tabs: [{
        id: 'spot',
        label: 'Spot'
      }, {
        id: 'forward',
        label: 'Forward'
      }]
    })),
    footer: "Source: Bank of England yield curve archive \xB7 imported daily at 07:30"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      alignItems: 'center',
      padding: '14px 20px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--fg-3)',
      marginRight: 4
    }
  }, "Compare dates"), D.DATES.slice(0, 8).map(d => {
    const i = dates.indexOf(d);
    return /*#__PURE__*/React.createElement(Tag, {
      key: d,
      selected: i >= 0,
      color: i >= 0 ? colors[i] : undefined,
      onClick: () => toggle(d)
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 12
      }
    }, d));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 12px 8px'
    }
  }, /*#__PURE__*/React.createElement(YieldCurveChart, {
    height: 340,
    series: series,
    showPoints: points,
    xTicks: [0.5, 5, 10, 15, 20, 25, 30, 35, 40]
  }))));
}
window.CurvesScreen = CurvesScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/genwood-app/CurvesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/genwood-app/DataScreen.jsx
try { (() => {
const {
  Card,
  Table,
  Select,
  Button,
  Tabs
} = window.GenwoodDesignSystem_cb120d;
function DataScreen() {
  const D = window.GW_DATA;
  const [kind, setKind] = React.useState('nominal');
  const cols = [0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40];
  const rows = D.curves[kind].map(c => {
    const r = {
      id: c.date,
      date: c.date
    };
    cols.forEach(m => r['m' + m] = c.points.find(p => p[0] === m)[1].toFixed(4));
    return r;
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 32px',
      maxWidth: 'var(--content-max)'
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Curve data",
    subtitle: "Imported spot rates by valuation date and maturity.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Select, {
      value: kind,
      onChange: e => setKind(e.target.value),
      options: [{
        value: 'nominal',
        label: 'Nominal spot'
      }, {
        value: 'real',
        label: 'Real spot'
      }, {
        value: 'inflation',
        label: 'Inflation spot'
      }],
      style: {
        width: 170
      }
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      icon: "download"
    }, "Export CSV"))
  }), /*#__PURE__*/React.createElement(Card, {
    flush: true,
    footer: rows.length + ' valuation dates · % per annum'
  }, /*#__PURE__*/React.createElement(Table, {
    dense: true,
    stickyHeader: true,
    rows: rows,
    columns: [{
      key: 'date',
      header: 'Date',
      mono: true
    }].concat(cols.map(m => ({
      key: 'm' + m,
      header: m + 'Y',
      align: 'right',
      mono: true
    })))
  })));
}
window.DataScreen = DataScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/genwood-app/DataScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/genwood-app/FileDetailScreen.jsx
try { (() => {
const {
  Icon,
  Card,
  Badge,
  Table,
  Button,
  Tabs,
  YieldCurveChart
} = window.GenwoodDesignSystem_cb120d;
function Meta({
  k,
  v,
  mono
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--fg-3)'
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      font: mono ? 'var(--type-data)' : 'var(--type-body)',
      color: 'var(--fg-1)'
    }
  }, v));
}
function FileDetailScreen({
  file,
  onBack,
  onReimport,
  onViewCurve
}) {
  const [view, setView] = React.useState('table');
  const D = window.GW_DATA;
  const set = D.curves[file.kind].find(c => c.date === file.date);
  const cols = [0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40];
  const rows = D.curves[file.kind].slice(D.DATES.indexOf(file.date), D.DATES.indexOf(file.date) + 6).map(c => {
    const r = {
      id: c.date,
      date: c.date
    };
    cols.forEach(m => r['m' + m] = c.points.find(p => p[0] === m)[1].toFixed(4));
    return r;
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 32px',
      maxWidth: 'var(--content-max)'
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    crumb: /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        border: 0,
        background: 'none',
        padding: 0,
        marginBottom: 8,
        cursor: 'pointer',
        font: 'var(--type-label)',
        color: 'var(--fg-link)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-left",
      size: 14
    }), "File log"),
    title: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        fontSize: 22
      }
    }, file.file),
    subtitle: file.curve + ' · valuation date ' + file.date,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      icon: "download"
    }, "Download original"), /*#__PURE__*/React.createElement(Button, {
      variant: file.status === 'danger' ? 'primary' : 'secondary',
      icon: "rotate-ccw",
      onClick: onReimport
    }, "Re-import"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '300px minmax(0,1fr)',
      gap: 20,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Summary",
    actions: /*#__PURE__*/React.createElement(Badge, {
      tone: file.status
    }, file.label)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Meta, {
    k: "Received",
    v: file.received,
    mono: true
  }), /*#__PURE__*/React.createElement(Meta, {
    k: "Duration",
    v: file.duration,
    mono: true
  }), /*#__PURE__*/React.createElement(Meta, {
    k: "Rows loaded",
    v: file.rows == null ? '—' : file.rows.toLocaleString(),
    mono: true
  }), /*#__PURE__*/React.createElement(Meta, {
    k: "File size",
    v: file.size,
    mono: true
  }), /*#__PURE__*/React.createElement(Meta, {
    k: "Source",
    v: "Bank of England"
  }), /*#__PURE__*/React.createElement(Meta, {
    k: "Triggered by",
    v: file.user
  }))), (file.warnings > 0 || file.error) && /*#__PURE__*/React.createElement(Card, {
    title: file.error ? 'Error' : 'Validation warnings',
    padding: 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, (file.error ? [file.error] : D.warnings).map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 8,
      font: 'var(--type-caption)',
      color: 'var(--fg-2)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: file.error ? 'circle-x' : 'triangle-alert',
    size: 14,
    color: file.error ? 'var(--status-danger-fg)' : 'var(--status-warning-fg)',
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("span", null, w)))))), file.error ? /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '48px 20px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-x",
    size: 28,
    color: "var(--fg-3)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-h3)',
      marginTop: 12
    }
  }, "No data loaded from this file"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--fg-3)',
      marginTop: 4,
      marginBottom: 16
    }
  }, "Fix the source file or re-import once the Bank of England republishes it."), /*#__PURE__*/React.createElement(Button, {
    icon: "rotate-ccw",
    onClick: onReimport
  }, "Re-import"))) : /*#__PURE__*/React.createElement(Card, {
    title: "File contents",
    subtitle: 'Spot rates (%) by maturity in years · showing ' + rows.length + ' of 22 business days',
    flush: true,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tabs, {
      variant: "segmented",
      value: view,
      onChange: setView,
      tabs: [{
        id: 'table',
        label: 'Table'
      }, {
        id: 'chart',
        label: 'Chart'
      }]
    }), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      iconRight: "arrow-right",
      onClick: onViewCurve
    }, "Open in Yield curves")),
    footer: 'Sheet ‘4. spot curve’ · maturities 0.5–40Y in 0.5Y steps (12 shown)'
  }, view === 'table' ? /*#__PURE__*/React.createElement(Table, {
    dense: true,
    rows: rows,
    selectedKey: file.date,
    columns: [{
      key: 'date',
      header: 'Date',
      mono: true
    }].concat(cols.map(m => ({
      key: 'm' + m,
      header: m + 'Y',
      align: 'right',
      mono: true
    })))
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 12px 8px'
    }
  }, /*#__PURE__*/React.createElement(YieldCurveChart, {
    height: 300,
    series: [{
      name: file.date,
      points: set.points
    }]
  })))));
}
window.FileDetailScreen = FileDetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/genwood-app/FileDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/genwood-app/FileLogScreen.jsx
try { (() => {
const {
  Icon,
  Card,
  Stat,
  Badge,
  Table,
  Tabs,
  Button,
  Input,
  Select,
  IconButton
} = window.GenwoodDesignSystem_cb120d;
function FileLogScreen({
  files,
  onOpen,
  onImport
}) {
  const [tab, setTab] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [curve, setCurve] = React.useState('all');
  const counts = {
    all: files.length,
    success: files.filter(f => f.status === 'success').length,
    warning: files.filter(f => f.status === 'warning').length,
    danger: files.filter(f => f.status === 'danger').length
  };
  const rows = files.filter(f => (tab === 'all' || f.status === tab) && (curve === 'all' || f.kind === curve) && f.file.toLowerCase().includes(q.toLowerCase()));
  const latest = window.GW_DATA.curves.nominal[0].points.find(p => p[0] === 10)[1],
    prior = window.GW_DATA.curves.nominal[1].points.find(p => p[0] === 10)[1];
  const bp = ((latest - prior) * 100).toFixed(1);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 32px',
      maxWidth: 'var(--content-max)'
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "File log",
    subtitle: "Every yield curve file received from the Bank of England, newest first.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      icon: "download"
    }, "Export log"), /*#__PURE__*/React.createElement(Button, {
      icon: "upload",
      onClick: onImport
    }, "Import file"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
      gap: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 16
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Last import",
    value: "07:44",
    delta: "Wed 1 Oct 2026"
  })), /*#__PURE__*/React.createElement(Card, {
    padding: 16
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Files this month",
    value: files.length,
    delta: counts.success + ' imported cleanly'
  })), /*#__PURE__*/React.createElement(Card, {
    padding: 16
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Needs attention",
    value: counts.warning + counts.danger,
    delta: counts.danger + ' failed · ' + counts.warning + ' with warnings',
    tone: counts.danger ? 'down' : 'neutral'
  })), /*#__PURE__*/React.createElement(Card, {
    padding: 16
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "10Y nominal spot",
    value: latest.toFixed(3),
    unit: "%",
    delta: (bp > 0 ? '+' : '') + bp + ' bp vs prior day',
    tone: bp > 0 ? 'up' : 'down'
  }))), /*#__PURE__*/React.createElement(Card, {
    flush: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      columnGap: 16,
      padding: '4px 16px 0'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    style: {
      flex: '1 1 auto',
      borderBottom: 0,
      flexWrap: 'wrap'
    },
    tabs: [{
      id: 'all',
      label: 'All files',
      count: counts.all
    }, {
      id: 'success',
      label: 'Imported',
      count: counts.success
    }, {
      id: 'warning',
      label: 'Warnings',
      count: counts.warning
    }, {
      id: 'danger',
      label: 'Failed',
      count: counts.danger
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      paddingBottom: 8,
      paddingTop: 6,
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    value: curve,
    onChange: e => setCurve(e.target.value),
    options: [{
      value: 'all',
      label: 'All curves'
    }, {
      value: 'nominal',
      label: 'Nominal'
    }, {
      value: 'real',
      label: 'Real'
    }, {
      value: 'inflation',
      label: 'Inflation'
    }],
    style: {
      width: 140,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement(Input, {
    size: "sm",
    icon: "search",
    placeholder: "Filter by file name",
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      width: 200,
      maxWidth: '100%'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement(Table, {
    rows: rows,
    onRowClick: onOpen,
    columns: [{
      key: 'file',
      header: 'File',
      mono: true,
      render: (v, r) => /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "file-spreadsheet",
        size: 16,
        color: "var(--fg-3)"
      }), v)
    }, {
      key: 'curve',
      header: 'Curve'
    }, {
      key: 'received',
      header: 'Received',
      mono: true,
      muted: true
    }, {
      key: 'rows',
      header: 'Rows',
      align: 'right',
      mono: true,
      render: v => v == null ? '—' : v.toLocaleString()
    }, {
      key: 'label',
      header: 'Status',
      render: (v, r) => /*#__PURE__*/React.createElement(Badge, {
        tone: r.status
      }, v)
    }, {
      key: 'go',
      header: '',
      align: 'right',
      width: 40,
      render: () => /*#__PURE__*/React.createElement(Icon, {
        name: "chevron-right",
        size: 16,
        color: "var(--fg-3)"
      })
    }]
  }), !rows.length && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: 'center',
      font: 'var(--type-body)',
      color: 'var(--fg-3)'
    }
  }, "No files match these filters.")));
}
window.FileLogScreen = FileLogScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/genwood-app/FileLogScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/genwood-app/ImportDialog.jsx
try { (() => {
const {
  Dialog,
  Button,
  Checkbox,
  RadioGroup,
  Input
} = window.GenwoodDesignSystem_cb120d;
function ImportDialog({
  open,
  onClose,
  onImport
}) {
  const [kinds, setKinds] = React.useState({
    nominal: true,
    real: true,
    inflation: true
  });
  const [mode, setMode] = React.useState('Latest published');
  const n = Object.values(kinds).filter(Boolean).length;
  return /*#__PURE__*/React.createElement(Dialog, {
    open: open,
    onClose: onClose,
    title: "Import from Bank of England",
    description: "Fetch yield curve files now instead of waiting for the 07:30 schedule.",
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      icon: "upload",
      disabled: !n,
      onClick: () => onImport(Object.keys(kinds).filter(k => kinds[k]))
    }, 'Import ' + n + ' file' + (n === 1 ? '' : 's')))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--fg-2)'
    }
  }, "Curves"), [['nominal', 'Nominal'], ['real', 'Real'], ['inflation', 'Implied inflation']].map(([k, l]) => /*#__PURE__*/React.createElement(Checkbox, {
    key: k,
    label: l,
    checked: kinds[k],
    onChange: v => setKinds(s => ({
      ...s,
      [k]: v
    }))
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--fg-2)'
    }
  }, "Valuation date"), /*#__PURE__*/React.createElement(RadioGroup, {
    direction: "row",
    value: mode,
    onChange: setMode,
    options: ['Latest published', 'Specific date']
  }), mode === 'Specific date' && /*#__PURE__*/React.createElement(Input, {
    mono: true,
    defaultValue: "2026-10-01",
    icon: "calendar",
    hint: "Business days only. Existing data for this date will be replaced."
  }))));
}
window.ImportDialog = ImportDialog;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/genwood-app/ImportDialog.jsx", error: String((e && e.message) || e) }); }

// ui_kits/genwood-app/data.js
try { (() => {
(function () {
  const MAT = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 35, 40];
  const DATES = ['2026-10-01', '2026-09-30', '2026-09-29', '2026-09-28', '2026-09-25', '2026-09-24', '2026-09-23', '2026-09-22', '2026-09-21', '2026-09-18'];
  function curve(kind, di) {
    const s = Math.sin(di * 1.7) * 0.025 + di * 0.006;
    return MAT.map(t => {
      let y;
      if (kind === 'nominal') y = 3.86 + 0.92 * (1 - Math.exp(-t / 9)) - 0.24 * Math.exp(-t / 1.5) - (t > 22 ? 0.0045 * (t - 22) : 0);else if (kind === 'real') y = 0.38 + 1.12 * (1 - Math.exp(-t / 10)) + (t < 3 ? 0.28 * (3 - t) / 3 : 0) - (t > 25 ? 0.003 * (t - 25) : 0);else y = 3.48 - 0.2 * (1 - Math.exp(-t / 6)) + (t < 2 ? 0.15 * (2 - t) / 2 : 0) - (t > 20 ? 0.002 * (t - 20) : 0);
      const tilt = Math.cos(di * 2.3 + 1) * 0.018 * Math.log1p(t) - Math.sin(di * 1.1) * 0.012 * Math.exp(-t / 3);
      return [t, +(y - s + tilt).toFixed(4)];
    });
  }
  const KINDS = {
    nominal: 'Nominal spot',
    real: 'Real spot',
    inflation: 'Inflation spot'
  };
  const FILE = {
    nominal: 'GLC Nominal daily data',
    real: 'GLC Real daily data',
    inflation: 'GLC Inflation daily data'
  };
  const files = [];
  let id = 1;
  DATES.forEach((d, di) => ['nominal', 'real', 'inflation'].forEach((k, ki) => {
    let status = 'success',
      label = 'Imported',
      warnings = 0,
      error = null;
    if (di === 0 && k === 'inflation') {
      status = 'danger';
      label = 'Failed';
      error = "Sheet '4. spot curve' not found in workbook.";
    } else if (di === 0 && k === 'real' || di === 4 && k === 'nominal') {
      status = 'warning';
      warnings = 3;
      label = '3 warnings';
    }
    const dd = d.slice(8) + ' ' + ['Sep', 'Oct'][+d.slice(5, 7) - 9];
    files.push({
      id: id++,
      kind: k,
      curve: KINDS[k],
      file: FILE[k] + '_' + d + '.xlsx',
      date: d,
      received: dd + ' 07:4' + (2 + ki),
      rows: status === 'danger' ? null : k === 'nominal' ? 1180 : k === 'real' ? 1062 : 1062,
      size: k === 'nominal' ? '284 KB' : '261 KB',
      status,
      label,
      warnings,
      error,
      user: 'system (scheduled)',
      duration: status === 'danger' ? '0.8s' : (2.1 + ki * 0.3).toFixed(1) + 's'
    });
  }));
  const curves = {};
  ['nominal', 'real', 'inflation'].forEach(k => curves[k] = DATES.map((d, di) => ({
    date: d,
    points: curve(k, di)
  })));
  window.GW_DATA = {
    MAT,
    DATES,
    KINDS,
    files,
    curves,
    warnings: ['Row 46: missing value at 39.5Y — interpolated from neighbours.', 'Row 47: missing value at 40.0Y — carried forward.', 'Header row contains an unexpected blank column (Z).']
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/genwood-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.YieldCurveChart = __ds_scope.YieldCurveChart;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.RadioGroup = __ds_scope.RadioGroup;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.SideNav = __ds_scope.SideNav;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
