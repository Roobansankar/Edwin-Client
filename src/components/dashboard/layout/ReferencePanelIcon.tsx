// Sidebar toggle icon: a plain panel with a left rail (lucide "panel-left"),
// the same icon the shadcn Emporium layout uses. It looks the same whether
// the sidebar is open or collapsed; the button's aria-label says which.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ReferencePanelIcon(_props: { collapsed: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}
