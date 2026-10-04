const { Card, Table, Select, Button, Tabs } = window.GenwoodDesignSystem_cb120d;
function DataScreen() {
  const D = window.GW_DATA;
  const [kind, setKind] = React.useState('nominal');
  const cols = [0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40];
  const rows = D.curves[kind].map(c => { const r = { id: c.date, date: c.date }; cols.forEach(m => r['m' + m] = c.points.find(p => p[0] === m)[1].toFixed(4)); return r; });
  return <div style={{ padding: '28px 32px', maxWidth: 'var(--content-max)' }}>
    <PageHeader title="Curve data" subtitle="Imported spot rates by valuation date and maturity."
      actions={<><Select value={kind} onChange={e => setKind(e.target.value)} options={[{ value: 'nominal', label: 'Nominal spot' }, { value: 'real', label: 'Real spot' }, { value: 'inflation', label: 'Inflation spot' }]} style={{ width: 170 }} /><Button variant="secondary" icon="download">Export CSV</Button></>} />
    <Card flush footer={rows.length + ' valuation dates · % per annum'}>
      <Table dense stickyHeader rows={rows} columns={[{ key: 'date', header: 'Date', mono: true }].concat(cols.map(m => ({ key: 'm' + m, header: m + 'Y', align: 'right', mono: true })))} />
    </Card>
  </div>;
}
window.DataScreen = DataScreen;
