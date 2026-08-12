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
          colorPrimary: '#1677ff',
          colorInfo: '#1677ff',
          colorBgBase: isDark ? '#0b1120' : '#fafafb',
          colorBgContainer: isDark ? '#101827' : '#ffffff',
          colorBgElevated: isDark ? '#111827' : '#ffffff',
          colorBgLayout: isDark ? '#0b1120' : '#fafafb',
          colorText: isDark ? '#e5e7eb' : '#262626',
          colorTextSecondary: isDark ? '#94a3b8' : '#595959',
          colorBorder: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(0,0,0,0.06)',
          colorBorderSecondary: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(0,0,0,0.04)',
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
            bodyBg: isDark ? '#0b1120' : '#fafafb',
            siderBg: '#0b1120',
          },
          Menu: {
            itemBg: 'transparent',
            itemBorderRadius: 8,
            itemMarginInline: 8,
            itemColor: isDark ? '#cbd5e1' : '#262626',
            itemHoverBg: isDark ? 'rgba(148,163,184,0.10)' : '#f5f5f5',
            itemHoverColor: isDark ? '#f8fafc' : '#262626',
            itemSelectedBg: isDark ? 'rgba(56,189,248,0.14)' : '#e6f4ff',
            itemSelectedColor: isDark ? '#e0f2fe' : '#1677ff',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
