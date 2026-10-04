Modal for confirmations and short forms (e.g. manual import, re-run failed file) over a Forest-tinted scrim.
```jsx
<Dialog open title="Re-import file?" description="Existing rows for 1 Oct 2026 will be replaced." onClose={close} footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button>Re-import</Button></>} />
```
