'use client';

import { useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { useThemeStore } from '@/store/theme';

// Three looks: light, dark black (shadcn "neutral": near-black page, #171717
// surfaces, off-white primary) and dark navy (the original blue dark theme).
const palettes = {
  light: {
    primary: '#1677ff', onPrimary: '#ffffff', info: '#1677ff', link: '#1677ff', tableBorder: '#ececec',
    bgBase: '#fafafb', container: '#ffffff', elevated: '#ffffff', layout: '#fafafb',
    text: '#262626', textSecondary: '#595959',
    border: 'rgba(0,0,0,0.06)', borderSecondary: 'rgba(0,0,0,0.04)',
    headerBg: '#ffffff', siderBg: '#fafafa', switchHandle: '#ffffff',
    segmentedSelected: '#ffffff', segmentedTrack: '#f5f5f5',
    menuColor: '#262626', menuHoverBg: '#f5f5f5', menuHoverColor: '#262626',
    menuSelectedBg: '#e6f4ff', menuSelectedColor: '#1677ff',
  },
  black: {
    primary: '#fafafa', onPrimary: '#0a0a0a', tableBorder: '#262626', info: '#a1a1a1', link: '#fafafa',
    bgBase: '#0a0a0a', container: '#0a0a0a', elevated: '#1c1c1c', layout: '#0a0a0a',
    text: '#fafafa', textSecondary: '#a1a1a1',
    border: 'rgba(255,255,255,0.12)', borderSecondary: 'rgba(255,255,255,0.08)',
    headerBg: '#0a0a0a', siderBg: '#171717', switchHandle: '#0a0a0a',
    segmentedSelected: '#262626', segmentedTrack: '#0a0a0a',
    menuColor: '#d4d4d4', menuHoverBg: 'rgba(255,255,255,0.06)', menuHoverColor: '#fafafa',
    menuSelectedBg: '#262626', menuSelectedColor: '#fafafa',
  },
  navy: {
    primary: '#1677ff', onPrimary: '#ffffff', info: '#1677ff', link: '#38bdf8', tableBorder: '#1e2b40',
    bgBase: '#0b1120', container: '#0b1120', elevated: '#111827', layout: '#0b1120',
    text: '#e5e7eb', textSecondary: '#94a3b8',
    border: 'rgba(148,163,184,0.18)', borderSecondary: 'rgba(148,163,184,0.14)',
    headerBg: '#101827', siderBg: '#101827', switchHandle: '#ffffff',
    segmentedSelected: '#1b2b3e', segmentedTrack: '#0b1120',
    menuColor: '#cbd5e1', menuHoverBg: 'rgba(148,163,184,0.10)', menuHoverColor: '#f8fafc',
    menuSelectedBg: 'rgba(56,189,248,0.14)', menuSelectedColor: '#e0f2fe',
  },
} as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const darkStyle = useThemeStore((s) => s.darkStyle) || 'black';
  const isDark = mode === 'dark';
  const p = isDark ? palettes[darkStyle] : palettes.light;

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.darkStyle = darkStyle;
  }, [mode, darkStyle]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: p.primary,
          colorInfo: p.info,
          colorLink: p.link,
          colorBgBase: p.bgBase,
          colorBgContainer: p.container,
          colorBgElevated: p.elevated,
          colorBgLayout: p.layout,
          colorText: p.text,
          colorTextSecondary: p.textSecondary,
          colorBorder: p.border,
          colorBorderSecondary: p.borderSecondary,
          fontFamily: 'var(--app-font)',
          fontSize: 15,
          borderRadius: 8,
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 36,
            primaryColor: p.onPrimary,
            primaryShadow: 'none',
          },
          Card: {
            borderRadiusLG: 8,
          },
          Layout: {
            headerBg: p.headerBg,
            bodyBg: p.layout,
            siderBg: p.siderBg,
          },
          Table: {
            borderColor: p.tableBorder,
            headerSplitColor: p.tableBorder,
          },
          Switch: {
            handleBg: p.switchHandle,
          },
          Segmented: {
            itemSelectedBg: p.segmentedSelected,
            trackBg: p.segmentedTrack,
          },
          Menu: {
            itemBg: 'transparent',
            itemBorderRadius: 8,
            itemMarginInline: 8,
            itemColor: p.menuColor,
            itemHoverBg: p.menuHoverBg,
            itemHoverColor: p.menuHoverColor,
            itemSelectedBg: p.menuSelectedBg,
            itemSelectedColor: p.menuSelectedColor,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
