const { Dialog, Button, Checkbox, RadioGroup, Input } = window.GenwoodDesignSystem_cb120d;
function ImportDialog({ open, onClose, onImport }) {
  const [kinds, setKinds] = React.useState({ nominal: true, real: true, inflation: true });
  const [mode, setMode] = React.useState('Latest published');
  const n = Object.values(kinds).filter(Boolean).length;
  return <Dialog open={open} onClose={onClose} title="Import from Bank of England" description="Fetch yield curve files now instead of waiting for the 07:30 schedule."
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon="upload" disabled={!n} onClick={() => onImport(Object.keys(kinds).filter(k => kinds[k]))}>{'Import ' + n + ' file' + (n === 1 ? '' : 's')}</Button></>}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ font: 'var(--type-label)', color: 'var(--fg-2)' }}>Curves</div>
        {[['nominal', 'Nominal'], ['real', 'Real'], ['inflation', 'Implied inflation']].map(([k, l]) => <Checkbox key={k} label={l} checked={kinds[k]} onChange={v => setKinds(s => ({ ...s, [k]: v }))} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ font: 'var(--type-label)', color: 'var(--fg-2)' }}>Valuation date</div>
        <RadioGroup direction="row" value={mode} onChange={setMode} options={['Latest published', 'Specific date']} />
        {mode === 'Specific date' && <Input mono defaultValue="2026-10-01" icon="calendar" hint="Business days only. Existing data for this date will be replaced." />}
      </div>
    </div>
  </Dialog>;
}
window.ImportDialog = ImportDialog;
