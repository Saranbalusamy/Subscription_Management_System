import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Customer, Invoice, Payment, Plan, Product, Subscription, User } from './models.js';
import { connectDatabase } from './config/db.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? '.env' });
dotenv.config({ path: 'apps/server/.env', override: false });
const app = express();
app.use(cors());
app.use(express.json());
const port = Number(process.env.PORT ?? 5000);
const jwtSecret = process.env.JWT_SECRET ?? 'development-only-secret-change-me';
const id = (value: string) => mongoose.Types.ObjectId.isValid(value);
const view = (value: any) => { const object = value?.toObject ? value.toObject() : { ...value }; if (object?._id) { object.id = String(object._id); delete object._id; } if (object.customerId && typeof object.customerId === 'object') { object.customer = object.customerId.company ?? object.customerId.name; object.customerId = String(object.customerId._id ?? object.customerId.id); } if (object.planId && typeof object.planId === 'object') { object.plan = object.planId.name; object.planId = String(object.planId._id ?? object.planId.id); } if (object.productId && typeof object.productId === 'object') object.productId = String(object.productId._id ?? object.productId.id); if (object.invoiceId && typeof object.invoiceId === 'object') object.invoice = object.invoiceId.number; return object; };
const error = (res: Response, status: number, message: string) => res.status(status).json({ error: message });
const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => handler(req, res).catch(next);

app.get('/api/health', (_req, res) => res.json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded', service: 'brightloop-api', database: mongoose.connection.readyState === 1 ? 'mongodb' : 'disconnected' }));

app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const [active, allInvoices, allPayments, planMix, renewals] = await Promise.all([Subscription.find({ status: 'active' }).lean(), Invoice.find().lean(), Payment.find().sort({ paidOn: -1 }).limit(4).populate('customerId').lean(), Subscription.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$planId', value: { $sum: '$amount' } } }]), Subscription.find({ status: { $in: ['active', 'expiring'] } }).sort({ nextBillingDate: 1 }).limit(4).populate('customerId planId').lean()]);
  const mrr = active.reduce((sum, item) => sum + (item.billing === 'Yearly' ? item.amount / 12 : item.amount), 0);
  const collected = allPayments.reduce((sum, item) => sum + item.amount, 0);
  const outstanding = allInvoices.reduce((sum, item) => sum + Math.max(item.amount - item.paidAmount, 0), 0);
  const plans = await Plan.find({ _id: { $in: planMix.map((item) => item._id) } }).lean();
  const totalMix = planMix.reduce((sum, item) => sum + item.value, 0) || 1;
  const revenueTrend = await Payment.aggregate([{ $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidOn' } }, revenue: { $sum: '$amount' } } }, { $sort: { _id: 1 } }, { $limit: 12 }]);
  res.json({ metrics: { activeSubscriptions: active.length, mrr: Math.round(mrr), arr: Math.round(mrr * 12), collected, outstanding, overdue: allInvoices.filter((item) => item.status === 'overdue').length, cancellations: await Subscription.countDocuments({ status: 'closed' }), upcomingRenewals: renewals.length }, revenueTrend: revenueTrend.map((item) => ({ month: item._id, revenue: item.revenue })), planBreakdown: planMix.map((item) => ({ name: plans.find((plan) => String(plan._id) === String(item._id))?.name ?? 'Unknown', value: Math.round((item.value / totalMix) * 100), color: '#6557e8' })), recentPayments: allPayments.map(view), renewals: renewals.map(view) });
}));

app.get('/api/customers', async (req, res) => { const query = String(req.query.search ?? ''); const filter = query ? { $or: [{ name: new RegExp(query, 'i') }, { email: new RegExp(query, 'i') }] } : {}; res.json({ data: (await Customer.find(filter).sort({ createdAt: -1 }).lean()).map(view) }); });
app.get('/api/customers/:id', async (req, res) => { if (!id(req.params.id)) return error(res, 400, 'Invalid customer id'); const customer = await Customer.findById(req.params.id).lean(); if (!customer) return error(res, 404, 'Customer not found'); const [subscriptions, invoices, payments] = await Promise.all([Subscription.find({ customerId: req.params.id }).populate('planId productId').lean(), Invoice.find({ customerId: req.params.id }).lean(), Payment.find({ customerId: req.params.id }).lean()]); res.json({ data: { ...view(customer), subscriptions: subscriptions.map(view), invoices: invoices.map(view), payments: payments.map(view) } }); });
app.get('/api/subscriptions', async (_req, res) => res.json({ data: (await Subscription.find().populate('customerId planId productId').sort({ createdAt: -1 }).lean()).map(view) }));
app.get('/api/invoices', async (_req, res) => res.json({ data: (await Invoice.find().populate('customerId').sort({ issuedOn: -1 }).lean()).map(view) }));
app.get('/api/payments', async (_req, res) => res.json({ data: (await Payment.find().populate('customerId invoiceId').sort({ paidOn: -1 }).lean()).map(view) }));
app.get('/api/products', async (_req, res) => res.json({ data: (await Product.find().sort({ name: 1 }).lean()).map(view) }));
app.get('/api/plans', async (_req, res) => res.json({ data: (await Plan.find().sort({ price: 1 }).lean()).map(view) }));

app.post('/api/auth/login', async (req, res) => { const parsed = z.object({ email: z.string().email(), password: z.string().min(9) }).safeParse(req.body); if (!parsed.success) return error(res, 400, 'Enter a valid email and a password longer than 8 characters'); const user = await User.findOne({ email: parsed.data.email }).lean() as any; if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return error(res, 401, 'Invalid email or password'); res.json({ token: jwt.sign({ sub: String(user._id), role: user.role }, jwtSecret, { expiresIn: '8h' }), user: { id: String(user._id), name: user.name, email: user.email, role: user.role } }); });

const customerSchema = z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional(), company: z.string().optional(), address: z.string().optional(), customerType: z.string().optional(), status: z.enum(['active', 'at-risk', 'inactive']).optional() });
app.post('/api/customers', async (req, res) => { const parsed = customerSchema.safeParse(req.body); if (!parsed.success) return error(res, 400, 'Name and a valid email are required'); try { const customer = await Customer.create(parsed.data); res.status(201).json({ data: view(customer) }); } catch (e: any) { if (e.code === 11000) return error(res, 409, 'A customer with this email already exists'); throw e; } });
app.patch('/api/customers/:id', async (req, res) => { if (!id(req.params.id)) return error(res, 400, 'Invalid customer id'); const parsed = customerSchema.partial().safeParse(req.body); if (!parsed.success) return error(res, 400, 'Invalid customer details'); const customer = await Customer.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true }).lean(); return customer ? res.json({ data: view(customer) }) : error(res, 404, 'Customer not found'); });

const subscriptionSchema = z.object({ customerId: z.string(), planId: z.string(), productId: z.string().optional(), quantity: z.number().int().positive().default(1), billing: z.enum(['Daily', 'Weekly', 'Monthly', 'Yearly']), amount: z.number().positive(), startDate: z.string(), expiryDate: z.string().optional(), nextBillingDate: z.string().optional() });
app.post('/api/subscriptions', async (req, res) => { const parsed = subscriptionSchema.safeParse(req.body); if (!parsed.success || !id(parsed.data?.customerId ?? '') || !id(parsed.data?.planId ?? '')) return error(res, 400, 'Customer, plan, billing, amount, and dates are required'); const customer = await Customer.findById(parsed.data.customerId); if (!customer) return error(res, 404, 'Customer not found'); const subscription = await Subscription.create({ ...parsed.data, number: `SUB-${Date.now()}`, startDate: new Date(parsed.data.startDate), expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : undefined, nextBillingDate: new Date(parsed.data.nextBillingDate ?? parsed.data.startDate) }); res.status(201).json({ data: view(subscription) }); });
app.patch('/api/subscriptions/:id/status', async (req, res) => { if (!id(req.params.id)) return error(res, 400, 'Invalid subscription id'); const status = z.enum(['active', 'paused', 'expiring', 'closed']).safeParse(req.body.status); if (!status.success) return error(res, 400, 'Invalid subscription status'); const subscription = await Subscription.findByIdAndUpdate(req.params.id, { status: status.data }, { new: true }).lean(); return subscription ? res.json({ data: view(subscription) }) : error(res, 404, 'Subscription not found'); });

const invoiceSchema = z.object({ customerId: z.string(), subscriptionId: z.string().optional(), plan: z.string().min(2), amount: z.number().positive(), dueOn: z.string() });
app.post('/api/invoices', async (req, res) => { const parsed = invoiceSchema.safeParse(req.body); if (!parsed.success || !id(parsed.data?.customerId ?? '')) return error(res, 400, 'Customer, plan, amount, and due date are required'); const invoice = await Invoice.create({ ...parsed.data, number: `INV-${Date.now()}`, dueOn: new Date(parsed.data.dueOn) }); res.status(201).json({ data: view(invoice) }); });
app.post('/api/invoices/:id/payments', async (req, res) => { if (!id(req.params.id)) return error(res, 400, 'Invalid invoice id'); const parsed = z.object({ amount: z.number().positive(), method: z.enum(['Card', 'Bank transfer', 'UPI']), reference: z.string().optional(), notes: z.string().optional() }).safeParse(req.body); if (!parsed.success) return error(res, 400, 'A positive amount and valid payment method are required'); const invoice = await Invoice.findById(req.params.id); if (!invoice) return error(res, 404, 'Invoice not found'); if (invoice.paidAmount + parsed.data.amount > invoice.amount) return error(res, 409, 'Payment exceeds invoice balance'); const payment = await Payment.create({ invoiceId: invoice._id, customerId: invoice.customerId, ...parsed.data }); invoice.paidAmount += parsed.data.amount; invoice.status = invoice.paidAmount === invoice.amount ? 'paid' : 'partially_paid'; await invoice.save(); res.status(201).json({ data: view(payment), invoice: view(invoice) }); });

app.use((_req, res) => error(res, 404, 'Route not found'));
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => { console.error(err); error(res, 500, 'Unexpected server error'); });

if (process.env.NODE_ENV !== 'test') {
  connectDatabase().then(() => app.listen(port, () => console.log(`Brightloop API listening on http://localhost:${port}`))).catch(() => { process.exitCode = 1; });
}
export default app;
