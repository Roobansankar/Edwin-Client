"use client";

import { useEffect, useRef, useState } from 'react';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import styles from './reference.module.css';

type SearchPage = { key: string; label: string };

export function PageSearch({ pages, onNavigate, collapsed = false }: { pages: SearchPage[]; onNavigate: (key: string) => void; collapsed?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else { setQuery(''); dialog.current?.showModal(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const results = pages.filter((page, index) => pages.findIndex((entry) => entry.key === page.key) === index && page.label.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <button type="button" className={styles.search} aria-label="Search pages" title="Search navigation" onClick={() => { setQuery(''); dialog.current?.showModal(); }}>
      <SearchOutlined />{!collapsed && <><span>Search...</span><kbd>Ctrl K</kbd></>}
    </button>
    <dialog ref={dialog} className={styles.dialog} aria-label="Search pages" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={styles.dialogHeader}><SearchOutlined /><input autoFocus aria-label="Find a page" placeholder="Search..." value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" className={styles.iconButton} aria-label="Close search" onClick={() => dialog.current?.close()}><CloseOutlined /></button></div>
      <div className={styles.dialogResults}>{results.map((page) => <button type="button" key={page.key} onClick={() => { dialog.current?.close(); onNavigate(page.key); }}>{page.label}</button>)}{results.length === 0 && <p>No pages found.</p>}</div>
    </dialog>
  </>;
}
