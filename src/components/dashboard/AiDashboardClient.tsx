'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Button, Card, Input, Popconfirm, Space, Spin, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { AiMessageContent } from './AiMessageContent';

type Message = { role: 'user' | 'assistant'; content: string };
type ChatSummary = { id: string; title: string; updatedAt: string };
type Chat = ChatSummary & { messages: Message[] };
async function chatRequest<T>(path = '', options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend/ai-chats${path}`, { ...options, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to load chat history.');
  return data;
}
const suggestions = ['Summarize all projects and their budgets', 'What are our total inflow, outflow, and net cash flow this month?', 'Show pending purchase orders and outstanding vendor payments'];

export function AiDashboardClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
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

  async function openChat(id: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
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

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-4">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>AI Dashboard</Typography.Title>
        </div>
        <Space><Button icon={<PlusOutlined />} disabled={busy} onClick={() => { setActiveId(null); setMessages([]); setError(''); setInput(''); }}>New chat</Button></Space>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside aria-label="Chat history" className="min-w-0 self-start px-2 py-3 lg:border-r lg:border-[var(--border)] lg:pr-3">
        <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Chat history</Typography.Title>
        <div className="max-h-48 overflow-y-auto lg:max-h-[65vh]" aria-label="Saved conversations">
          {historyLoading && <Spin size="small" />}
          {!historyLoading && !chats.length && <Typography.Text type="secondary">Your saved chats will appear here.</Typography.Text>}
          {chats.map((chat) => <div key={chat.id} className="mb-2 flex items-center gap-1 rounded-lg p-1" style={{ background: activeId === chat.id ? 'var(--subtle-bg)' : undefined }}>
            <button type="button" disabled={busy} onClick={() => void openChat(chat.id)} className="min-w-0 flex-1 cursor-pointer p-2 text-left disabled:cursor-wait" aria-current={activeId === chat.id ? 'true' : undefined}>
              <div className="truncate" title={chat.title}>{chat.title}</div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>{new Date(chat.updatedAt).toLocaleDateString()}</Typography.Text>
            </button>
            <Popconfirm title="Delete this chat?" description="This permanently deletes the conversation." okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => deleteChat(chat.id)} disabled={busy}>
              <Button type="text" danger icon={<DeleteOutlined />} disabled={busy} aria-label={`Delete chat: ${chat.title}`} />
            </Popconfirm>
          </div>)}
        </div>
      </aside>
      <div className="min-w-0">
      <Card>
        <div className="min-w-0 overflow-x-hidden overflow-y-auto" style={{ height: 'clamp(420px, 65vh, 850px)' }} role="log" aria-label="AI conversation" aria-live="polite">
          {!messages.length && !busy && <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
            <Avatar size={64} icon={<RobotOutlined />} style={{ background: '#1677ff' }} />
            <Typography.Title level={3} style={{ margin: 0 }}>How can I help today?</Typography.Title>
            <Typography.Text type="secondary">Get answers from current ERP records. Include a project name and date range for specific reports.</Typography.Text>
            <div className="flex flex-wrap justify-center gap-2">{suggestions.map((text) => <Button key={text} disabled={historyLoading} style={{ height: 'auto', whiteSpace: 'normal', padding: '10px 14px' }} onClick={() => void send(text)}>{text}</Button>)}</div>
          </div>}
          {messages.map((message, index) => <div key={index} className={`mb-5 flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <Avatar icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />} style={{ flexShrink: 0, background: message.role === 'user' ? '#64748b' : '#1677ff' }} />
            <div className={`min-w-0 rounded-xl p-3 ${message.role === 'user' ? 'max-w-[85%]' : 'flex-1'}`} style={{ background: message.role === 'user' ? 'var(--subtle-bg)' : 'var(--page-bg)' }}>
              <Typography.Text strong>{message.role === 'user' ? 'You' : 'Edwin AI'}</Typography.Text>
              {message.role === 'assistant' ? <AiMessageContent content={message.content} /> : <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 6 }}>{message.content}</div>}
            </div>
          </div>)}
          {busy && <Space className="p-3"><Spin size="small" /><Typography.Text type="secondary">Edwin AI is thinking…</Typography.Text></Space>}
          <div ref={end} />
        </div>
        {error && <Alert type="error" title={error} showIcon className="mb-3" />}
        <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="mt-4 flex items-end gap-3">
          <Input.TextArea aria-label="Message Edwin AI" placeholder="Ask Edwin AI…" value={input} maxLength={8000} disabled={busy || historyLoading} autoSize={{ minRows: 2, maxRows: 6 }} onChange={(event) => setInput(event.target.value)} onPressEnter={(event) => { if (!event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
          <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={busy} disabled={!input.trim() || historyLoading}>Send</Button>
        </form>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>Enter to send · Shift+Enter for a new line. Uses current ERP records with read-only access. Relevant report data and recent chat messages are processed by an external AI service. Verify figures before making decisions.</Typography.Paragraph>
      </Card>
      </div>
      </div>
    </div>
  );
}
