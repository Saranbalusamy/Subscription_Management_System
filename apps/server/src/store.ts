import { Customer, Invoice, Payment, Subscription } from './types.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const customers: Customer[] = [
  { id: 'cus_1', name: 'Acme Corporation', email: 'finance@acme.co', company: 'Acme Corporation', plan: 'Enterprise', status: 'active', mrr: 2490, joinedAt: '2024-06-12', initials: 'AC' },
  { id: 'cus_2', name: 'Northstar Labs', email: 'ops@northstar.io', company: 'Northstar Labs', plan: 'Scale', status: 'active', mrr: 890, joinedAt: '2024-09-04', initials: 'NL' },
  { id: 'cus_3', name: 'Nexa Digital', email: 'hello@nexa.digital', company: 'Nexa Digital', plan: 'Growth', status: 'at-risk', mrr: 490, joinedAt: '2024-03-19', initials: 'ND' },
  { id: 'cus_4', name: 'Pixel & Co.', email: 'accounts@pixel.co', company: 'Pixel & Co.', plan: 'Growth', status: 'active', mrr: 490, joinedAt: '2024-11-26', initials: 'PC' },
  { id: 'cus_5', name: 'Vertex Systems', email: 'billing@vertex.dev', company: 'Vertex Systems', plan: 'Enterprise', status: 'active', mrr: 2490, joinedAt: '2025-01-08', initials: 'VS' }
];

export const subscriptions: Subscription[] = [
  { id: 'sub_1', number: 'SUB-1048', customerId: 'cus_1', customer: 'Acme Corporation', plan: 'Enterprise', status: 'active', amount: 2490, billing: 'Monthly', renewsOn: '2025-02-14' },
  { id: 'sub_2', number: 'SUB-1047', customerId: 'cus_2', customer: 'Northstar Labs', plan: 'Scale', status: 'active', amount: 890, billing: 'Monthly', renewsOn: '2025-02-18' },
  { id: 'sub_3', number: 'SUB-1046', customerId: 'cus_3', customer: 'Nexa Digital', plan: 'Growth', status: 'expiring', amount: 490, billing: 'Monthly', renewsOn: '2025-02-09' },
  { id: 'sub_4', number: 'SUB-1045', customerId: 'cus_4', customer: 'Pixel & Co.', plan: 'Growth', status: 'active', amount: 490, billing: 'Monthly', renewsOn: '2025-03-02' },
  { id: 'sub_5', number: 'SUB-1044', customerId: 'cus_5', customer: 'Vertex Systems', plan: 'Enterprise', status: 'paused', amount: 2490, billing: 'Monthly', renewsOn: '2025-02-28' }
];

export const invoices: Invoice[] = [
  { id: 'inv_1', number: 'INV-2084', customer: 'Acme Corporation', plan: 'Enterprise', amount: 2490, status: 'paid', issuedOn: '2025-01-14', dueOn: '2025-01-14' },
  { id: 'inv_2', number: 'INV-2083', customer: 'Northstar Labs', plan: 'Scale', amount: 890, status: 'paid', issuedOn: '2025-01-18', dueOn: '2025-01-18' },
  { id: 'inv_3', number: 'INV-2082', customer: 'Nexa Digital', plan: 'Growth', amount: 490, status: 'overdue', issuedOn: '2025-01-09', dueOn: '2025-01-23' },
  { id: 'inv_4', number: 'INV-2081', customer: 'Pixel & Co.', plan: 'Growth', amount: 490, status: 'open', issuedOn: '2025-01-02', dueOn: '2025-02-02' },
  { id: 'inv_5', number: 'INV-2080', customer: 'Vertex Systems', plan: 'Enterprise', amount: 2490, status: 'paid', issuedOn: '2024-12-28', dueOn: '2024-12-28' }
];

export const payments: Payment[] = [
  { id: 'pay_1', customer: 'Acme Corporation', invoice: 'INV-2084', amount: 2490, method: 'Card', paidOn: '2025-01-14' },
  { id: 'pay_2', customer: 'Northstar Labs', invoice: 'INV-2083', amount: 890, method: 'Bank transfer', paidOn: '2025-01-18' },
  { id: 'pay_3', customer: 'Vertex Systems', invoice: 'INV-2080', amount: 2490, method: 'Card', paidOn: '2024-12-28' }
];

export interface Product { id: string; name: string; type: string; price: number; active: boolean; variants: { name: string; price: number }[]; }
export interface Plan { id: string; name: string; price: number; interval: 'Monthly' | 'Yearly'; active: boolean; }
export const products: Product[] = [
  { id: 'prd_1', name: 'Brightloop Core', type: 'SaaS platform', price: 490, active: true, variants: [{ name: 'Standard', price: 0 }, { name: 'Odoo connector', price: 560 }] },
  { id: 'prd_2', name: 'Brightloop Insights', type: 'Analytics add-on', price: 290, active: true, variants: [{ name: 'Standard', price: 0 }] }
];
export const plans: Plan[] = [
  { id: 'plan_1', name: 'Growth', price: 490, interval: 'Monthly', active: true },
  { id: 'plan_2', name: 'Scale', price: 890, interval: 'Monthly', active: true },
  { id: 'plan_3', name: 'Enterprise', price: 2490, interval: 'Monthly', active: true }
];

const dataPath = join(dirname(fileURLToPath(import.meta.url)), '../data.json');
const initial = { customers, subscriptions, invoices, payments, products, plans };
if (existsSync(dataPath)) {
  const saved = JSON.parse(readFileSync(dataPath, 'utf8')) as typeof initial;
  customers.splice(0, customers.length, ...saved.customers);
  subscriptions.splice(0, subscriptions.length, ...saved.subscriptions);
  invoices.splice(0, invoices.length, ...saved.invoices);
  payments.splice(0, payments.length, ...saved.payments);
  products.splice(0, products.length, ...saved.products);
  plans.splice(0, plans.length, ...saved.plans);
}
export const persist = () => writeFileSync(dataPath, JSON.stringify({ customers, subscriptions, invoices, payments, products, plans }, null, 2));
