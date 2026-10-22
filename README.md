This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Admin AI dashboard

Administrators can open **AI Dashboard** from the sidebar at `/dashboard/ai`.
Set `OPENROUTER_API_KEY` in `.env.local` locally and in the deployment server's environment.
Never prefix this key with `NEXT_PUBLIC_` or commit it. Restart the development server after changing environment variables.
`OPENROUTER_MODEL` optionally overrides the default `openrouter/free` model.
The integration uses `@openrouter/sdk` through the authenticated `/api/ai/chat` server route.
The assistant reads current ERP data through admin-only `/ai-chats/erp/catalog` and `/ai-chats/erp/context` backend endpoints. It uses `openrouter/free` to identify report filters, retrieves validated read-only reports, then answers from that data. This is live retrieval, not model fine-tuning.
Connected datasets: projects, expense claims, payment-ledger inflow/outflow/net cashflow, purchase orders, material requirements/receipts, invoices/receivables, vendor bills/PO payables, subcontract work orders/bills. Project and inclusive date filters are supported. SQL computes totals across all matching records; detailed rows and project groups have explicit limits. The assistant asks for clarification when a project or filter cannot be identified reliably.
Common pending-order and vendor-payable questions resolve known project names/codes directly without requiring model-generated filter JSON. Combined requests retrieve pending orders and outstanding balances independently, so the pending-order status does not narrow the payable report. Run `node --test tests/ai-erp.test.cjs` for filter-planning regressions.
Project names/codes, relevant business report fields, and recent chat messages are sent to OpenRouter. Bank credentials, passwords, file attachments, and personnel records are excluded. No model-generated SQL or ERP write actions are allowed. No additional schema migration is needed for this data connection.
Conversation history is saved in PostgreSQL per admin account. The history panel reopens saved conversations and permanently deletes individual chats. New chat starts a separate conversation without deleting earlier ones.
Deploy the server migration `1790800000000-CreateAiChats` using `node run-migration.mjs` after building the backend. The filter planner receives up to six recent saved messages; the answer model receives up to twelve, plus the current question and fresh reports.

See the [OpenRouter SDK documentation](https://github.com/OpenRouterTeam/docs/blob/main/client-sdks/overview.mdx).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
