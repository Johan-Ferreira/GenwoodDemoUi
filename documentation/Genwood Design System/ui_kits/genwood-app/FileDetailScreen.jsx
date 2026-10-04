const { Icon, Card, Badge, Table, Button, Tabs, YieldCurveChart } = window.GenwoodDesignSystem_cb120d;
function Meta({ k, v, mono }) { return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><div style={{ font: 'var(--type-caption)', color: 'var(--fg-3)' }}>{k}</div><div style={{ font: mono ? 'var(--type-data)' : 'var(--type-body)', color: 'var(--fg-1)' }}>{v}</div></div>; }
function FileDetailScreen({ file, onBack, onReimport, onViewCurve }) {
  const [view, setView] = React.useState('table');
  const D = window.GW_DATA;
  const set = D.curves[file.kind].find(c => c.date === file.date);
  const cols = [0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40];
  const rows = D.curves[file.kind].slice(D.DATES.indexOf(file.date), D.DATES.indexOf(file.date) + 6).map(c => { const r = { id: c.date, date: c.date }; cols.forEach(m => r['m' + m] = c.points.find(p => p[0] === m)[1].toFixed(4)); return r; });
  return <div style={{ padding: '28px 32px', maxWidth: 'var(--content-max)' }}>
    <PageHeader crumb={<button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 0, background: 'none', padding: 0, marginBottom: 8, cursor: 'pointer', font: 'var(--type-label)', color: 'var(--fg-link)' }}><Icon name="arrow-left" size={14} />File log</button>}
      title={<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 22 }}>{file.file}</span>} subtitle={file.curve + ' · valuation date ' + file.date}
      actions={<><Button variant="secondary" icon="download">Download original</Button><Button variant={file.status === 'danger' ? 'primary' : 'secondary'} icon="rotate-ccw" onClick={onReimport}>Re-import</Button></>} />
    <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Summary" actions={<Badge tone={file.status}>{file.label}</Badge>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Meta k="Received" v={file.received} mono /><Meta k="Duration" v={file.duration} mono />
            <Meta k="Rows loaded" v={file.rows == null ? '—' : file.rows.toLocaleString()} mono /><Meta k="File size" v={file.size} mono />
            <Meta k="Source" v="Bank of England" /><Meta k="Triggered by" v={file.user} />
          </div>
        </Card>
        {(file.warnings > 0 || file.error) && <Card title={file.error ? 'Error' : 'Validation warnings'} padding={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(file.error ? [file.error] : D.warnings).map((w, i) => <div key={i} style={{ display: 'flex', gap: 8, font: 'var(--type-caption)', color: 'var(--fg-2)' }}><Icon name={file.error ? 'circle-x' : 'triangle-alert'} size={14} color={file.error ? 'var(--status-danger-fg)' : 'var(--status-warning-fg)'} style={{ marginTop: 2 }} /><span>{w}</span></div>)}
          </div>
        </Card>}
      </div>
      {file.error ? <Card><div style={{ padding: '48px 20px', textAlign: 'center' }}><Icon name="file-x" size={28} color="var(--fg-3)" /><div style={{ font: 'var(--type-h3)', marginTop: 12 }}>No data loaded from this file</div><div style={{ font: 'var(--type-body)', color: 'var(--fg-3)', marginTop: 4, marginBottom: 16 }}>Fix the source file or re-import once the Bank of England republishes it.</div><Button icon="rotate-ccw" onClick={onReimport}>Re-import</Button></div></Card> :
      <Card title="File contents" subtitle={'Spot rates (%) by maturity in years · showing ' + rows.length + ' of 22 business days'} flush
        actions={<><Tabs variant="segmented" value={view} onChange={setView} tabs={[{ id: 'table', label: 'Table' }, { id: 'chart', label: 'Chart' }]} /><Button size="sm" variant="ghost" iconRight="arrow-right" onClick={onViewCurve}>Open in Yield curves</Button></>}
        footer={'Sheet ‘4. spot curve’ · maturities 0.5–40Y in 0.5Y steps (12 shown)'}>
        {view === 'table' ? <Table dense rows={rows} selectedKey={file.date} columns={[{ key: 'date', header: 'Date', mono: true }].concat(cols.map(m => ({ key: 'm' + m, header: m + 'Y', align: 'right', mono: true })))} />
          : <div style={{ padding: '16px 12px 8px' }}><YieldCurveChart height={300} series={[{ name: file.date, points: set.points }]} /></div>}
      </Card>}
    </div>
  </div>;
}
window.FileDetailScreen = FileDetailScreen;
