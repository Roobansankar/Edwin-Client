export function ReferencePanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={collapsed ? 'm6 6 6 6-6 6m7-12 6 6-6 6' : 'm11 6-6 6 6 6m7-12-6 6 6 6'} />
    </svg>
  );
}
