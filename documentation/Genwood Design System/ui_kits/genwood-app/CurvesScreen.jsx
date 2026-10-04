const { Card, Stat, Tag, Select, Tabs, Button, Checkbox, Table, YieldCurveChart } = window.GenwoodDesignSystem_cb120d;
function CurvesScreen({ initialKind = 'nominal' }) {
  const D = window.GW_DATA;
  const [kind, setKind] = React.useState(initialKind);
  const [dates, setDates] = React.useState([D.DATES[0], D.DATES[5]]);
  const [measure, setMeasure] = React.useState('spot');
  const [points, setPoints] = React.useState(false);
  const toggle = d => setDates(ds => ds.includes(d) ? (ds.length > 1 ? ds.filter(x => x !== d) : ds) : ds.concat(d).slice(-5));
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  const series = dates.map((d, i) => ({ name: d, points: D.curves[kind].find(c => c.date === d).points, color: colors[i] }));
  const pick = (d, m) => D.curves[kind].find(c => c.date === d).points.find(p => p[0] === m)[1];
  const base = dates[0];
  const tenors = [2, 5, 10, 30];
  return <div style={{ padding: '28px 32px', maxWidth: 'var(--content-max)' }}>
    <PageHeader title="Yield curves" subtitle="Compare Bank of England curves across valuation dates."
      actions={<><Select value={kind} onChange={e => setKind(e.target.value)} options={[{ value: 'nominal', label: 'Nominal' }, { value: 'real', label: 'Real' }, { value: 'inflation', label: 'Implied inflation' }]} style={{ width: 170 }} /><Button variant="secondary" icon="download">Export</Button></>} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 20 }}>
      {tenors.map(t => { const v = pick(base, t), p = pick(D.DATES[1], t), bp = ((v - p) * 100).toFixed(1);
        return <Card key={t} padding={16}><Stat label={t + 'Y ' + measure} value={v.toFixed(3)} unit="%" delta={(bp > 0 ? '+' : '') + bp + ' bp on day'} tone={bp > 0 ? 'up' : bp < 0 ? 'down' : 'neutral'} /></Card>; })}
    </div>
    <Card title={D.KINDS[kind] + ' curve'} subtitle={'Continuously compounded, % per annum · ' + dates.length + ' date' + (dates.length > 1 ? 's' : '')} flush
      actions={<><Checkbox label="Show points" checked={points} onChange={setPoints} /><Tabs variant="segmented" value={measure} onChange={setMeasure} tabs={[{ id: 'spot', label: 'Spot' }, { id: 'forward', label: 'Forward' }]} /></>}
      footer="Source: Bank of England yield curve archive · imported daily at 07:30">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '14px 20px 0' }}>
        <span style={{ font: 'var(--type-caption)', color: 'var(--fg-3)', marginRight: 4 }}>Compare dates</span>
        {D.DATES.slice(0, 8).map(d => { const i = dates.indexOf(d); return <Tag key={d} selected={i >= 0} color={i >= 0 ? colors[i] : undefined} onClick={() => toggle(d)}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{d}</span></Tag>; })}
      </div>
      <div style={{ padding: '12px 12px 8px' }}><YieldCurveChart height={340} series={series} showPoints={points} xTicks={[0.5, 5, 10, 15, 20, 25, 30, 35, 40]} /></div>
    </Card>
  </div>;
}
window.CurvesScreen = CurvesScreen;
