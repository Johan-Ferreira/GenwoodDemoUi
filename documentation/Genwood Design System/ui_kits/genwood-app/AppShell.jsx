const { Icon, IconButton, SideNav } = window.GenwoodDesignSystem_cb120d;
function AppHeader({ onHome }) {
  return <header style={{ height: 'var(--header-h)', background: 'var(--surface-brand)', display: 'flex', alignItems: 'center', padding: '0 16px 0 20px', gap: 16, flex: 'none' }}>
    <img src="../../assets/genwood-logo.png" alt="Genwood" onClick={onHome} style={{ height: 34, cursor: 'pointer' }} />
    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,.18)' }} />
    <div style={{ font: 'var(--type-label)', fontSize: 13, color: 'var(--fg-on-brand-muted)' }}>Market data · Yield curves</div>
    <div style={{ flex: 1 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 10px', borderRadius: 4, background: 'rgba(255,255,255,.08)', color: 'var(--fg-on-brand-muted)', font: 'var(--type-caption)', width: 240 }}>
      <Icon name="search" size={14} /> Search files and dates
    </div>
    <IconButton icon="bell" label="Notifications" variant="onBrand" />
    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gw-forest-600)', color: '#fff', font: 'var(--weight-semibold) 12px/30px var(--font-sans)', textAlign: 'center' }}>AM</div>
  </header>;
}
function AppShell({ screen, onNav, children, failed }) {
  const items = [{ section: 'Imports' }, { id: 'log', label: 'File log', icon: 'history', count: failed }, { section: 'Market data' }, { id: 'data', label: 'Curve data', icon: 'table' }, { id: 'curves', label: 'Yield curves', icon: 'chart-line' }];
  return <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
    <AppHeader onHome={() => onNav('log')} />
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <SideNav value={screen === 'file' ? 'log' : screen} onChange={onNav} items={items}
        footer={<div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 10px', font: 'var(--type-caption)', color: 'var(--fg-3)' }}><Icon name="landmark" size={14} style={{ marginTop: 2 }} /><span>Source: Bank of England<br />Next import 07:30 tomorrow</span></div>} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--surface-page)' }}>{children}</main>
    </div>
  </div>;
}
function PageHeader({ title, subtitle, actions, crumb }) {
  return <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      {crumb}
      <h1 style={{ margin: 0, font: 'var(--type-h1)', color: 'var(--fg-1)' }}>{title}</h1>
      {subtitle && <div style={{ font: 'var(--type-body)', color: 'var(--fg-3)', marginTop: 4 }}>{subtitle}</div>}
    </div>
    {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
  </div>;
}
Object.assign(window, { AppShell, AppHeader, PageHeader });
