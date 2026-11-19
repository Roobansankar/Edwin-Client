'use client';

import { createContext, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// The dashboard layout provides a navigate function that moves to a page
// inside a React transition, so the content area shows the loader until the
// new page has rendered. Pages use these hooks instead of calling
// router.push directly; outside the layout they fall back to router.push.

type Navigate = (href: string) => void;

const NavigationContext = createContext<Navigate | null>(null);

export const DashboardNavigationProvider = NavigationContext.Provider;

export function useDashboardNavigate(): Navigate {
  const router = useRouter();
  const navigate = useContext(NavigationContext);
  return navigate ?? ((href: string) => router.push(href));
}

/** Same as useRouter(), but push() goes through the layout's loader. */
export function useDashboardRouter() {
  const router = useRouter();
  const navigate = useContext(NavigationContext);
  return useMemo(() => (navigate ? { ...router, push: (href: string) => navigate(href) } : router), [router, navigate]);
}
