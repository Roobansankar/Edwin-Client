import Link from 'next/link';

// Shown for any URL that doesn't match a page (e.g. a removed route).
// Layout follows the reference design: a small "404" badge, a large heading,
// a short message and a single dark "Go Homepage" button. Colours come from
// the app's theme tokens so it reads correctly in light and dark mode.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--page-bg)] px-6 text-center">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] shadow-md">
        404
      </div>

      <h1 className="mt-8 text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-6xl">
        Page not found!
      </h1>

      <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--text-muted)]">
        Oops! It looks like the page you&apos;re trying to reach is not available.
        Please check the URL or return to the homepage.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-[var(--text-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--page-bg)] shadow-md hover:opacity-90"
      >
        Go Homepage
      </Link>
    </div>
  );
}
