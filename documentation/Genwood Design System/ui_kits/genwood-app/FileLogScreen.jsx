const { Icon, Card, Stat, Badge, Table, Tabs, Button, Input, Select, IconButton } = window.GenwoodDesignSystem_cb120d;
function FileLogScreen({ files, onOpen, onImport }) {
  const [tab, setTab] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [curve, setCurve] = React.useState('all');
  const counts = { all: files.length, success: files.filter(f => f.status === 'success').length, warning: files.filter(f => f.status === 'warning').length, danger: files.filter(f => f.status === 'danger').length };
  const rows = files.filter(f => (tab === 'all' || f.status === tab) && (curve === 'all' || f.kind === curve) && f.file.toLowerCase().includes(q.toLowerCase()));
  const latest = window.GW_DATA.curves.nominal[0].points.find(p => p[0] === 10)[1], prior = window.GW_DATA.curves.nominal[1].points.find(p => p[0] === 10)[1];
  const bp = ((latest - prior) * 100).toFixed(1);
  return <div style={{ padding: '28px 32px', maxWidth: 'var(--content-max)' }}>
    <PageHeader title="File log" subtitle="Every yield curve file received from the Bank of England, newest first."
      actions={<><Button variant="secondary" icon="download">Export log</Button><Button icon="upload" onClick={onImport}>Import file</Button></>} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 20 }}>
      <Card padding={16}><Stat label="Last import" value="07:44" delta="Wed 1 Oct 2026" /></Card>
      <Card padding={16}><Stat label="Files this month" value={files.length} delta={counts.success + ' imported cleanly'} /></Card>
      <Card padding={16}><Stat label="Needs attention" value={counts.warning + counts.danger} delta={counts.danger + ' failed · ' + counts.warning + ' with warnings'} tone={counts.danger ? 'down' : 'neutral'} /></Card>
      <Card padding={16}><Stat label="10Y nominal spot" value={latest.toFixed(3)} unit="%" delta={(bp > 0 ? '+' : '') + bp + ' bp vs prior day'} tone={bp > 0 ? 'up' : 'down'} /></Card>
    </div>
    <Card flush>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 16, padding: '4px 16px 0' }}>
        <Tabs value={tab} onChange={setTab} style={{ flex: '1 1 auto', borderBottom: 0, flexWrap: 'wrap' }} tabs={[{ id: 'all', label: 'All files', count: counts.all }, { id: 'success', label: 'Imported', count: counts.success }, { id: 'warning', label: 'Warnings', count: counts.warning }, { id: 'danger', label: 'Failed', count: counts.danger }]} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 8, paddingTop: 6, marginLeft: 'auto' }}>
          <Select size="sm" value={curve} onChange={e => setCurve(e.target.value)} options={[{ value: 'all', label: 'All curves' }, { value: 'nominal', label: 'Nominal' }, { value: 'real', label: 'Real' }, { value: 'inflation', label: 'Inflation' }]} style={{ width: 140, flex: 'none' }} />
          <Input size="sm" icon="search" placeholder="Filter by file name" value={q} onChange={e => setQ(e.target.value)} style={{ width: 200, maxWidth: '100%' }} />
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--border-default)' }} />
      <Table rows={rows} onRowClick={onOpen} columns={[
        { key: 'file', header: 'File', mono: true, render: (v, r) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="file-spreadsheet" size={16} color="var(--fg-3)" />{v}</span> },
        { key: 'curve', header: 'Curve' },
        { key: 'received', header: 'Received', mono: true, muted: true },
        { key: 'rows', header: 'Rows', align: 'right', mono: true, render: v => v == null ? '—' : v.toLocaleString() },
        { key: 'label', header: 'Status', render: (v, r) => <Badge tone={r.status}>{v}</Badge> },
        { key: 'go', header: '', align: 'right', width: 40, render: () => <Icon name="chevron-right" size={16} color="var(--fg-3)" /> },
      ]} />
      {!rows.length && <div style={{ padding: 40, textAlign: 'center', font: 'var(--type-body)', color: 'var(--fg-3)' }}>No files match these filters.</div>}
    </Card>
  </div>;
}
window.FileLogScreen = FileLogScreen;
