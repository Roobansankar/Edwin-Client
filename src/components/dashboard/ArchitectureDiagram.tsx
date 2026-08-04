'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, Segmented, Typography, Spin, Space } from 'antd';
import { NodeIndexOutlined, DatabaseOutlined, ClusterOutlined } from '@ant-design/icons';

const erDiagram = `
erDiagram
    PROJECT ||--o{ SALES_INVOICE : bills
    PROJECT ||--o{ PURCHASE_BILL : incurs
    PROJECT ||--o{ PURCHASE_ORDER : contains
    PROJECT ||--o{ EXPENSE : has
    PROJECT ||--o{ DAILY_LABOUR_REPORT : tracks
    PROJECT ||--o{ DRAWING : has
    PROJECT ||--o{ SUBCONTRACT_WORK_ORDER : assigns
    PROJECT ||--o{ PAYMENT : "tracks revenue/cost"
    
    VENDOR ||--o{ PURCHASE_ORDER : supplies
    VENDOR ||--o{ PURCHASE_BILL : invoices
    VENDOR ||--o{ PAYMENT : receives
    
    SUBCONTRACTOR ||--o{ SUBCONTRACT_WORK_ORDER : performs
    
    SALES_INVOICE ||--|{ INVOICE_ITEM : has
    SALES_INVOICE ||--o{ PAYMENT : receives
    
    PURCHASE_BILL ||--o{ PAYMENT : cleared_by
    PURCHASE_ORDER ||--|{ PO_ITEM : has
    PURCHASE_ORDER ||--o{ PURCHASE_BILL : "converted to"
    
    DAILY_LABOUR_REPORT ||--|{ DAILY_WORKER : "lists headcount"
    
    USER ||--o{ PROJECT : manages
    USER ||--o{ EXPENSE : creates
    USER ||--o{ SALES_INVOICE : generates
`;

const flowDiagram = `
graph TD
    Login((Login)) --> Admin[Admin & Office Team]
    Login --> Engineers[Site Engineers]
    Login --> Purchase[Purchase Team]
    
    subgraph "Project Setup & Records"
        Admin --> Projects[Manage Projects]
        Admin --> Staff[Manage Site Engineers]
        Admin --> DPR[View Daily Reports]
        Admin --> Drawings[Store Project Drawings]
    end
    
    subgraph "Field Work & Site Costs"
        Engineers --> Attendance[Record Daily Attendance]
        Engineers --> SiteExpenses[Record Site Expenses]
        Attendance -- "Generates" --> LabourCost[Labour Cost Data]
    end
    
    subgraph "Procurement (Buying)"
        Purchase --> Vendors[Manage Suppliers]
        Purchase --> PO[Create Purchase Orders]
        PO -- "Converted to" --> Bills[Supplier Bills]
    end
    
    subgraph "Accounts & Financials"
        Admin --> Invoices[Client Sales Invoices]
        Bills --> Payments[Payment Ledger]
        SiteExpenses --> Payments
        LabourCost --> Payments
        Invoices --> Payments
        
        Payments --> Results[Profit & Balance Tracking]
    end

    Admin --> Architecture((System Map))
`;

export function ArchitectureDiagram() {
  const [view, setView] = useState<'er' | 'flow'>('flow');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMermaid = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Load mermaid from CDN if not already present
        if (!(window as any).mermaid) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
          script.async = true;
          script.onload = () => initMermaid();
          document.body.appendChild(script);
        } else {
          initMermaid();
        }
      } catch (err) {
        console.error('Failed to load mermaid', err);
        setLoading(false);
      }
    };

    const initMermaid = () => {
      const mermaid = (window as any).mermaid;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      renderDiagram();
    };

    loadMermaid();
  }, []);

  useEffect(() => {
    if (!(window as any).mermaid) return;
    renderDiagram();
  }, [view]);

  const renderDiagram = async () => {
    setLoading(true);
    const mermaid = (window as any).mermaid;
    const content = view === 'er' ? erDiagram : flowDiagram;
    
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const id = `mermaid-svg-${Math.random().toString(36).substr(2, 9)}`;
      try {
        const { svg } = await mermaid.render(id, content);
        containerRef.current.innerHTML = svg;
      } catch (err) {
        console.error('Mermaid render error', err);
        containerRef.current.innerHTML = '<div class="p-4 text-red-500">Failed to render diagram</div>';
      }
    }
    setLoading(false);
  };

  return (
    <Card 
      className="overflow-hidden border border-[var(--border)] bg-[var(--subtle-bg)]"
      title={
        <Space>
          <NodeIndexOutlined className="text-sky-400" />
          <Typography.Text strong className="text-[var(--text-primary)]">ERP System Connections</Typography.Text>
        </Space>
      }
      extra={
        <Segmented
          value={view}
          onChange={(v) => setView(v as 'er' | 'flow')}
          options={[
            { label: 'Business Flow', value: 'flow', icon: <ClusterOutlined /> },
            { label: 'Technical View', value: 'er', icon: <DatabaseOutlined /> },
          ]}
        />
      }
    >
      <div className="relative min-h-[500px] w-full overflow-auto rounded-lg bg-[var(--page-bg)]/50 p-6">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--page-bg)]/80">
            <Spin size="large" description="Generating Diagram..." />
          </div>
        )}
        <div 
          ref={containerRef} 
          className="flex justify-center mermaid-container [&>svg]:max-w-[900px] [&>svg]:h-auto"
        />
      </div>
      
      <div className="mt-6 border-t border-white/5 pt-6">
        <Typography.Title level={5} className="text-[var(--text-secondary)]">
          {view === 'flow' ? 'How the ERP Works (Business Map)' : 'Technical Database Structure'}
        </Typography.Title>
        <Typography.Paragraph className="text-[var(--text-muted)]">
          {view === 'flow' 
            ? 'This map shows how different departments work together. Site Engineers record field data, the Purchase Team manages procurement, and the Admin/Office Team oversees financials. All activities automatically flow into the Payment Ledger to track the project’s real profit and balance.'
            : 'This is a technical view showing how the database tables are linked. It helps developers understand how data like Projects, Invoices, and Payments are connected behind the scenes.'}
        </Typography.Paragraph>
      </div>
    </Card>
  );
}
