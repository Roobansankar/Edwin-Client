'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Input, Popconfirm } from 'antd';
import {
  ArrowUpOutlined,
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  DollarOutlined,
  HistoryOutlined,
  PlusOutlined,
  ProjectOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  StarFilled,
  WalletOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/auth';
import { AiMessageContent } from './AiMessageContent';
import { ListSkeleton } from './Skeletons';

type Message = { role: 'user' | 'assistant'; content: string };
type ChatSummary = { id: string; title: string; updatedAt: string };
type Chat = ChatSummary & { messages: Message[] };

async function chatRequest<T>(path = '', options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend/ai-chats${path}`, { ...options, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to load chat history.');
  return data;
}

const starters: Array<{ icon: ReactNode; tone: string; title: string; prompt: string }> = [
  {
    icon: <ProjectOutlined />,
    tone: '#8b5cf6',
    title: 'Project overview',
    prompt: 'Summarize all projects and their budgets',
  },
  {
    icon: <WalletOutlined />,
    tone: '#10b981',
    title: 'Cash flow this month',
    prompt: 'What are our total inflow, outflow, and net cash flow this month?',
  },
  {
    icon: <ShoppingCartOutlined />,
    tone: '#f59e0b',
    title: 'Pending purchases',
    prompt: 'Show pending purchase orders and outstanding vendor payments',
  },
  {
    icon: <DollarOutlined />,
    tone: '#0ea5e9',
    title: 'Money owed to us',
    prompt: 'List unpaid and overdue invoices with the amount due for each project',
  },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Buckets for the history list: Today / Yesterday / Previous 7 days / Older.
function groupChats(chats: ChatSummary[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  const groups: Array<{ label: string; items: ChatSummary[] }> = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] },
  ];
  for (const chat of chats) {
    const t = new Date(chat.updatedAt).getTime();
    if (t >= startOfToday.getTime()) groups[0].items.push(chat);
    else if (t >= startOfToday.getTime() - day) groups[1].items.push(chat);
    else if (t >= startOfToday.getTime() - 7 * day) groups[2].items.push(chat);
    else groups[3].items.push(chat);
  }
  return groups.filter((g) => g.items.length);
}

function AiMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg bg-[var(--text-primary)] text-[var(--card-bg)]"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      <StarFilled />
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
    >
      {copied ? <CheckOutlined /> : <CopyOutlined />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function AiDashboardClient() {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false); // mobile drawer
  const end = useRef<HTMLDivElement>(null);
  const pending = useRef(false);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, busy]);

  useEffect(() => {
    let cancelled = false;
    chatRequest<ChatSummary[]>().then((data) => { if (!cancelled) setChats(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load history.'); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function remember(chat: Chat) {
    setChats((previous) => [{ id: chat.id, title: chat.title, updatedAt: chat.updatedAt }, ...previous.filter((item) => item.id !== chat.id)]);
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setError('');
    setInput('');
    setHistoryOpen(false);
  }

  async function openChat(id: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setHistoryOpen(false);
    try {
      const chat = await chatRequest<Chat>(`/${id}`);
      setActiveId(id);
      setMessages(chat.messages);
      setInput('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to open chat.'); }
    finally { pending.current = false; setBusy(false); }
  }

  async function deleteChat(id: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await chatRequest(`/${id}`, { method: 'DELETE' });
      setChats((previous) => previous.filter((chat) => chat.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); setInput(''); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete chat.'); }
    finally { pending.current = false; setBusy(false); }
  }

  async function send(text = input) {
    const content = text.trim();
    if (!content || pending.current || historyLoading) return;
    pending.current = true;
    const previous = messages;
    const next: Message[] = [...previous, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    try {
      let id = activeId;
      if (!id) {
        const created = await chatRequest<Chat>('', { method: 'POST' });
        id = created.id;
        setActiveId(id);
        remember(created);
      }
      const response = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, content }),
        signal: AbortSignal.timeout(125_000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to send message.');
      setMessages(data.messages);
      remember(data);
    } catch (err) {
      setMessages(previous);
      setInput(content);
      setError(err instanceof Error ? err.message : 'Unable to send message. Please try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const query = search.trim().toLowerCase();
  const visibleChats = query ? chats.filter((chat) => chat.title.toLowerCase().includes(query)) : chats;
  const groups = groupChats(visibleChats);
  const activeChat = chats.find((chat) => chat.id === activeId);
  const welcome = !messages.length && !busy;
  const firstName = (user?.name || '').split(/\s+/)[0];

  const composer = (large: boolean) => (
    <form
      onSubmit={(event) => { event.preventDefault(); void send(); }}
      className={`flex w-full items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] transition-colors focus-within:border-[var(--text-muted)] ${large ? 'p-3' : 'p-2'}`}
    >
      <Input.TextArea
        variant="borderless"
        aria-label="Message Edwin AI"
        placeholder={large ? 'Ask anything about your projects, money or purchases…' : 'Ask a follow-up…'}
        value={input}
        maxLength={8000}
        disabled={busy || historyLoading}
        autoSize={{ minRows: large ? 3 : 1, maxRows: 8 }}
        onChange={(event) => setInput(event.target.value)}
        onPressEnter={(event) => { if (!event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }}
        className="bg-transparent! text-[15px]!"
      />
      <button
        type="submit"
        disabled={busy || !input.trim() || historyLoading}
        aria-label="Send message"
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-[var(--text-primary)] text-[var(--card-bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
      >
        <ArrowUpOutlined />
      </button>
    </form>
  );

  const history = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={newChat}
          disabled={busy}
          className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--subtle-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusOutlined /> New chat
        </button>
        <label className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-[var(--text-muted)] focus-within:bg-[var(--subtle-bg)] hover:bg-[var(--subtle-bg)]">
          <SearchOutlined />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label="Saved conversations">
        {historyLoading && <div className="px-3"><ListSkeleton rows={6} avatar={false} /></div>}
        {!historyLoading && !chats.length && (
          <p className="m-0 px-3 py-6 text-center text-sm text-[var(--text-muted)]">No chats yet. Your conversations will be saved here.</p>
        )}
        {!historyLoading && chats.length > 0 && !visibleChats.length && (
          <p className="m-0 px-3 py-6 text-center text-sm text-[var(--text-muted)]">No chats match “{search}”.</p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-very-muted)]">{group.label}</div>
            {group.items.map((chat) => {
              const active = activeId === chat.id;
              return (
                <div key={chat.id} className={`group relative flex items-center rounded-lg ${active ? 'bg-[var(--subtle-hover-bg)]' : 'hover:bg-[var(--subtle-bg)]'}`}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void openChat(chat.id)}
                    aria-current={active ? 'true' : undefined}
                    title={chat.title}
                    className={`min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent py-2 pl-3 pr-9 text-left text-sm disabled:cursor-wait ${active ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                  >
                    {chat.title}
                  </button>
                  <Popconfirm
                    title="Delete this chat?"
                    description="This permanently deletes the conversation."
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => deleteChat(chat.id)}
                    disabled={busy}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Delete chat: ${chat.title}`}
                      className="absolute right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[var(--text-muted)] opacity-0 transition hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
                    >
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="relative grid w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--page-bg)] lg:grid-cols-[272px_minmax(0,1fr)]"
      style={{ height: 'clamp(560px, calc(100dvh - 140px), 1200px)' }}
    >
      {/* History: fixed column on desktop, slide-over on mobile */}
      <aside aria-label="Chat history" className="hidden min-h-0 border-r border-[var(--border)] bg-[var(--subtle-bg)] lg:block">
        {history}
      </aside>
      {historyOpen && (
        <div className="absolute inset-0 z-20 flex lg:hidden">
          <div className="h-full w-[84%] max-w-[320px] border-r border-[var(--border)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Chats</span>
              <button type="button" aria-label="Close chats" onClick={() => setHistoryOpen(false)} className="cursor-pointer border-0 bg-transparent text-[var(--text-muted)]">
                <CloseOutlined />
              </button>
            </div>
            <div className="h-[calc(100%-49px)]">{history}</div>
          </div>
          <button type="button" aria-label="Close chats" className="flex-1 border-0 bg-black/40" onClick={() => setHistoryOpen(false)} />
        </div>
      )}

      <section className="flex min-h-0 min-w-0 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border)] px-4">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Show chats"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[var(--text-muted)] hover:bg-[var(--subtle-bg)] lg:hidden"
          >
            <HistoryOutlined />
          </button>
          <AiMark size={26} />
          <div className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
            {welcome ? 'Edwin AI' : activeChat?.title || 'New conversation'}
          </div>
          {!welcome && (
            <button
              type="button"
              onClick={newChat}
              disabled={busy}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--subtle-bg)] disabled:opacity-50"
            >
              <PlusOutlined /> New
            </button>
          )}
        </header>

        {welcome ? (
          /* Welcome: greeting, big composer, starter cards */
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-10">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 w-fit"><AiMark size={44} /></div>
                <h2 className="m-0 text-[28px] font-semibold tracking-tight text-[var(--text-primary)] sm:text-[32px]">
                  {greeting()}{firstName ? `, ${firstName}` : ''}
                </h2>
                <p className="m-0 mt-2 text-[15px] text-[var(--text-muted)]">What would you like to know about your business today?</p>
              </div>

              {composer(true)}
              {error && <Alert type="error" title={error} showIcon className="mt-3" />}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {starters.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    disabled={historyLoading}
                    onClick={() => void send(s.prompt)}
                    className="group flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-left transition-colors hover:border-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base" style={{ background: `${s.tone}1f`, color: s.tone }}>
                      {s.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--text-primary)]">{s.title}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-[var(--text-muted)]">{s.prompt}</span>
                    </span>
                  </button>
                ))}
              </div>

              <p className="m-0 mt-8 text-center text-xs text-[var(--text-very-muted)]">
                Read-only access to current ERP records · Relevant data is processed by an external AI service · Verify figures before making decisions
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation */}
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden" role="log" aria-label="AI conversation" aria-live="polite">
              <div className="mx-auto max-w-3xl space-y-8 px-5 py-8">
                {messages.map((message, index) =>
                  message.role === 'user' ? (
                    <div key={index} className="flex justify-end">
                      <div
                        className="max-w-[80%] rounded-2xl bg-[var(--subtle-hover-bg)] px-4 py-3 text-[15px] leading-relaxed text-[var(--text-primary)]"
                        style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                      >
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div key={index} className="flex items-start gap-3">
                      <AiMark size={28} />
                      <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-[var(--text-primary)]">
                        <AiMessageContent content={message.content} />
                        <div className="-ml-2 mt-1"><CopyButton text={message.content} /></div>
                      </div>
                    </div>
                  ),
                )}
                {busy && (
                  <div className="flex items-center gap-3">
                    <AiMark size={28} />
                    <span className="flex items-center gap-1.5" aria-label="Edwin AI is thinking">
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-muted)]"
                          style={{ animationDelay: `${dot * 150}ms` }}
                        />
                      ))}
                    </span>
                  </div>
                )}
                <div ref={end} />
              </div>
            </div>

            <div className="shrink-0 px-4 pb-4 pt-2">
              <div className="mx-auto max-w-3xl">
                {error && <Alert type="error" title={error} showIcon className="mb-3" />}
                {composer(false)}
                <p className="m-0 mt-2 text-center text-[11px] text-[var(--text-very-muted)]">
                  Enter to send · Shift+Enter for a new line · Verify figures before making decisions
                </p>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
