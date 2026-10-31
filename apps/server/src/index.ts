import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { customers, invoices, payments, subscriptions, persist, plans, products } from './store.js';

const app = express();
app.use(cors());
app.use(express.json());

const money = (value: number) => Math.round(value * 100) / 100;
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'brightloop-api' }));

app.get('/api/dashboard', (_req, res) => {
  const active = subscriptions.filter((item) => item.status === 'active');
  const mrr = money(active.reduce((sum, item) => sum + item.amount, 0));
  const collected = money(payments.reduce((sum, item) => sum + item.amount, 0));
  const outstanding = money(invoices.filter((item) => item.status === 'open' || item.status === 'overdue').reduce((sum, item) => sum + item.amount, 0));
  res.json({
    metrics: { activeSubscriptions: active.length, mrr, arr: money(mrr * 12), collected, outstanding, overdue: invoices.filter((item) => item.status === 'overdue').length, cancellations: 3, upcomingRenewals: subscriptions.filter((item) => item.status !== 'closed').length },
    revenueTrend: [42, 48, 46, 55, 59, 64, 71, 74, 81, 79, 88, 94].map((revenue, index) => ({ month: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'][index], revenue })),
    planBreakdown: [{ name: 'Enterprise', value: 55, color: '#6557e8' }, { name: 'Scale', value: 28, color: '#20b486' }, { name: 'Growth', value: 17, color: '#f3a64a' }],
    recentPayments: payments.slice(0, 4),
    renewals: subscriptions.filter((item) => item.status === 'expiring' || item.status === 'active').slice(0, 4)
  });
});

app.get('/api/customers', (_req, res) => res.json({ data: customers }));
app.get('/api/subscriptions', (_req, res) => res.json({ data: subscriptions }));
app.get('/api/invoices', (_req, res) => res.json({ data: invoices }));
app.get('/api/payments', (_req, res) => res.json({ data: payments }));
app.get('/api/products', (_req, res) => res.json({ data: products }));
app.get('/api/plans', (_req, res) => res.json({ data: plans }));

app.post('/api/auth/login', (req, res) => {
  const email = z.string().email().safeParse(req.body.email);
  const password = z.string().min(9).safeParse(req.body.password);
  if (!email.success || !password.success) return res.status(400).json({ error: 'Enter a valid email and a password longer than 8 characters' });
  res.json({ token: `demo-session-${Date.now()}`, user: { name: 'Arjun Rao', email: email.data, role: 'admin' } });
});

const customerSchema = z.object({ name: z.string().min(2), email: z.string().email(), company: z.string().min(2), plan: z.string().min(2) });
app.post('/api/customers', (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid customer details', details: parsed.error.flatten() });
  if (customers.some((customer) => customer.email.toLowerCase() === parsed.data.email.toLowerCase())) return res.status(409).json({ error: 'A customer with this email already exists' });
  const customer = { id: `cus_${customers.length + 1}`, ...parsed.data, status: 'active' as const, mrr: 0, joinedAt: new Date().toISOString().slice(0, 10), initials: parsed.data.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() };
  customers.unshift(customer);
  persist();
  res.status(201).json({ data: customer });
});

const subscriptionSchema = z.object({ customerId: z.string(), plan: z.string().min(2), amount: z.number().positive(), billing: z.enum(['Monthly', 'Yearly']), renewsOn: z.string() });
app.post('/api/subscriptions', (req, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  const customer = parsed.success ? customers.find((item) => item.id === parsed.data.customerId) : undefined;
  if (!parsed.success || !customer) return res.status(400).json({ error: 'Customer, plan, amount, billing, and renewal date are required' });
  const subscription = { id: `sub_${Date.now()}`, number: `SUB-${1050 + subscriptions.length}`, customerId: customer.id, customer: customer.company, plan: parsed.data.plan, status: 'active' as const, amount: parsed.data.amount, billing: parsed.data.billing, renewsOn: parsed.data.renewsOn };
  subscriptions.unshift(subscription);
  customer.plan = subscription.plan;
  customer.mrr = parsed.data.billing === 'Yearly' ? Math.round(parsed.data.amount / 12) : parsed.data.amount;
  persist();
  res.status(201).json({ data: subscription });
});

app.patch('/api/subscriptions/:id/status', (req, res) => {
  const status = z.enum(['active', 'paused', 'expiring', 'closed']).safeParse(req.body.status);
  const subscription = subscriptions.find((item) => item.id === req.params.id);
  if (!status.success || !subscription) return res.status(400).json({ error: 'Invalid subscription status' });
  subscription.status = status.data;
  persist();
  res.json({ data: subscription });
});

const invoiceSchema = z.object({ customer: z.string().min(2), plan: z.string().min(2), amount: z.number().positive(), dueOn: z.string() });
app.post('/api/invoices', (req, res) => {
  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Customer, plan, amount, and due date are required' });
  const invoice = { id: `inv_${Date.now()}`, number: `INV-${2085 + invoices.length}`, ...parsed.data, status: 'open' as const, issuedOn: new Date().toISOString().slice(0, 10) };
  invoices.unshift(invoice);
  persist();
  res.status(201).json({ data: invoice });
});

app.post('/api/invoices/:id/payments', (req, res) => {
  const amount = z.number().positive().safeParse(req.body.amount);
  if (!amount.success) return res.status(400).json({ error: 'Payment amount must be positive' });
  const invoice = invoices.find((item) => item.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const alreadyPaid = payments.filter((payment) => payment.invoice === invoice.number).reduce((sum, payment) => sum + payment.amount, 0);
  if (alreadyPaid + amount.data > invoice.amount) return res.status(409).json({ error: 'Payment exceeds invoice balance' });
  const payment = { id: `pay_${payments.length + 1}`, customer: invoice.customer, invoice: invoice.number, amount: amount.data, method: (req.body.method ?? 'Card') as 'Card', paidOn: new Date().toISOString().slice(0, 10) };
  payments.unshift(payment);
  invoice.status = alreadyPaid + amount.data === invoice.amount ? 'paid' : 'open';
  persist();
  res.status(201).json({ data: payment, invoice });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
const port = Number(process.env.PORT ?? 4000);
if (process.env.NODE_ENV !== 'test') app.listen(port, () => console.log(`Brightloop API listening on http://localhost:${port}`));
export default app;
