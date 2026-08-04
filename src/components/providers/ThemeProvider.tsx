'use client';

import { useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { useThemeStore } from '@/store/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const isDark = mode === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#38bdf8',
          colorInfo: '#38bdf8',
          colorBgBase: isDark ? '#0b1120' : '#f8fafc',
          colorBgContainer: isDark ? '#101827' : '#ffffff',
          colorBgElevated: isDark ? '#111827' : '#ffffff',
          colorBgLayout: isDark ? '#0b1120' : '#f8fafc',
          colorText: isDark ? '#e5e7eb' : '#0f172a',
          colorTextSecondary: isDark ? '#94a3b8' : '#475569',
          colorBorder: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(0,0,0,0.10)',
          colorBorderSecondary: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(0,0,0,0.06)',
          fontFamily: 'var(--app-font)',
          borderRadius: 8,
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Card: {
            borderRadiusLG: 8,
          },
          Layout: {
            headerBg: isDark ? '#101827' : '#ffffff',
            bodyBg: isDark ? '#0b1120' : '#f8fafc',
            siderBg: '#0b1120',
          },
          Menu: {
            itemBg: 'transparent',
            itemBorderRadius: 8,
            itemColor: '#cbd5e1',
            itemHoverBg: 'rgba(148,163,184,0.10)',
            itemHoverColor: '#f8fafc',
            itemSelectedBg: 'rgba(56,189,248,0.14)',
            itemSelectedColor: '#e0f2fe',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
