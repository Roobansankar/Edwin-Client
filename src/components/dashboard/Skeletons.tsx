'use client';

// Loading indicator modelled on the shadcndashboard-demo "fallback spinner":
// three stacked rings, each with only its left edge coloured, spinning with a
// 0.1s stagger while the trailing two fade in, so it reads as one arc with a
// fading tail. Styles live in globals.css (.arc-loader). The old component
// names are kept so every existing loader uses it.

function ArcSpinner({ size }: { size: number }) {
  return (
    <span className="arc-loader" style={{ width: size, height: size }} role="status" aria-busy="true" aria-label="Loading">
      <span className="arc-loader__ring arc-loader__ring--1" />
      <span className="arc-loader__ring arc-loader__ring--2" />
      <span className="arc-loader__ring arc-loader__ring--3" />
    </span>
  );
}

/** Centred in the content panel, or in the whole screen with `fixed`. */
export function PageLoader({ fixed = false }: { fixed?: boolean; label?: string }) {
  return (
    <div className={`flex w-full items-center justify-center ${fixed ? 'min-h-screen' : 'min-h-[60vh]'}`}>
      <ArcSpinner size={55} />
    </div>
  );
}

/** Smaller spinner for a list or table loading inside a card. */
export function InlineLoader({ minHeight = 160 }: { minHeight?: number; label?: string }) {
  return (
    <div className="flex w-full items-center justify-center" style={{ minHeight }}>
      <ArcSpinner size={36} />
    </div>
  );
}

export function PageSkeleton() {
  return <PageLoader />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number; avatar?: boolean }) {
  return <InlineLoader minHeight={Math.max(140, rows * 44)} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number; columns?: number }) {
  return <InlineLoader minHeight={Math.max(160, rows * 44)} />;
}
