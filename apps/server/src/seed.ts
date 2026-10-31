import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Customer, Invoice, Payment, Plan, Product, Subscription, User } from './models.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? '.env' });
dotenv.config({ path: 'apps/server/.env', override: false });
const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI is not configured');
await mongoose.connect(uri);

async function removeDuplicates(model: any, key: string): Promise<number> {
  const duplicates = await model.aggregate([{ $group: { _id: `$${key}`, ids: { $push: '$_id' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]);
  let removed = 0;
  for (const duplicate of duplicates) {
    const [, ...extraIds] = duplicate.ids;
    if (extraIds.length) {
      const result = await model.deleteMany({ _id: { $in: extraIds } });
      removed += result.deletedCount ?? 0;
    }
  }
  return removed;
}

for (const [model, key] of [[Customer, 'email'], [Plan, 'name'], [Product, 'name'], [Subscription, 'number'], [Invoice, 'number']] as const) {
  await removeDuplicates(model, key);
}

const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin!12345', 12);
await User.updateOne({ email: 'admin@brightloop.local' }, { $set: { name: 'Arjun Rao', email: 'admin@brightloop.local', passwordHash, role: 'admin' } }, { upsert: true });
const legacyDemo = await Customer.findOne({ email: 'demo@brightloop.local' });
if (legacyDemo) {
  const linkedHistory = await Promise.all([Subscription.exists({ customerId: legacyDemo._id }), Invoice.exists({ customerId: legacyDemo._id }), Payment.exists({ customerId: legacyDemo._id })]);
  if (!linkedHistory.some(Boolean)) await Customer.deleteOne({ _id: legacyDemo._id });
}

const planData = [
  { name: 'Starter', price: 290, interval: 'Monthly', active: true },
  { name: 'Growth', price: 690, interval: 'Monthly', active: true },
  { name: 'Scale', price: 1490, interval: 'Monthly', active: true },
  { name: 'Business Annual', price: 14900, interval: 'Yearly', active: true },
  { name: 'Enterprise', price: 4990, interval: 'Monthly', active: true }
] as const;
await Plan.bulkWrite(planData.map((plan) => ({ updateOne: { filter: { name: plan.name }, update: { $set: plan }, upsert: true } })));

const productData = [
  { name: 'Brightloop Core', type: 'Subscription platform', price: 290, active: true, variants: [{ name: 'Standard', price: 0 }, { name: 'Advanced reporting', price: 180 }] },
  { name: 'Revenue Intelligence', type: 'Analytics add-on', price: 390, active: true, variants: [{ name: 'Standard', price: 0 }, { name: 'Forecasting pack', price: 240 }] },
  { name: 'Collections Hub', type: 'Payments add-on', price: 240, active: true, variants: [{ name: 'Standard', price: 0 }, { name: 'Priority collections', price: 150 }] },
  { name: 'Partner Portal', type: 'Portal add-on', price: 320, active: true, variants: [{ name: 'Standard', price: 0 }] }
];
await Product.bulkWrite(productData.map((product) => ({ updateOne: { filter: { name: product.name }, update: { $set: product }, upsert: true } })));

const customerData = [
  ['Aarav Mehta', 'aarav.mehta@orbitworks.in', 'Orbitworks Labs', '+91 98765 12001', 'Bengaluru'],
  ['Meera Iyer', 'meera.iyer@northstarhealth.com', 'Northstar Health', '+91 98765 12002', 'Chennai'],
  ['Rohan Shah', 'rohan.shah@pixelcraft.io', 'PixelCraft Studio', '+91 98765 12003', 'Mumbai'],
  ['Ananya Rao', 'ananya.rao@finbridge.co', 'FinBridge Capital', '+91 98765 12004', 'Pune'],
  ['Vikram Nair', 'vikram.nair@greenfield.agency', 'Greenfield Agency', '+91 98765 12005', 'Hyderabad'],
  ['Sanjana Das', 'sanjana.das@cloudnest.dev', 'CloudNest Technologies', '+91 98765 12006', 'Kolkata'],
  ['Karthik Menon', 'karthik.menon@atlasretail.com', 'Atlas Retail Group', '+91 98765 12007', 'Delhi'],
  ['Ishita Kapoor', 'ishita.kapoor@luminaedu.org', 'Lumina Education', '+91 98765 12008', 'Jaipur']
];
for (const [name, email, company, phone, city] of customerData) {
  await Customer.updateOne({ email }, { $set: { name, email, company, phone, address: city, customerType: 'business', status: 'active' } }, { upsert: true });
}

const customers = await Customer.find({ email: { $in: customerData.map((item) => item[1]) } });
const plans = await Plan.find({ name: { $in: planData.map((item) => item.name) } });
const products = await Product.find({ name: { $in: productData.map((item) => item.name) } });
const planByName = new Map(plans.map((plan) => [plan.name, plan]));
const productByName = new Map(products.map((product) => [product.name, product]));
const subscriptionData = [
  [0, 'Growth', 'Brightloop Core', 2, 1380, 'active'],
  [1, 'Scale', 'Revenue Intelligence', 1, 1880, 'active'],
  [2, 'Starter', 'Brightloop Core', 4, 1160, 'active'],
  [3, 'Enterprise', 'Collections Hub', 1, 5230, 'active'],
  [4, 'Business Annual', 'Partner Portal', 1, 15220, 'active'],
  [5, 'Scale', 'Brightloop Core', 2, 2980, 'paused'],
  [6, 'Growth', 'Revenue Intelligence', 1, 1080, 'expiring'],
  [7, 'Enterprise', 'Brightloop Core', 1, 5280, 'active']
] as const;
for (const [index, planName, productName, quantity, amount, status] of subscriptionData) {
  const customer = customers[index];
  const plan = planByName.get(planName);
  const product = productByName.get(productName);
  if (!customer || !plan || !product) continue;
  const start = new Date(Date.UTC(2026, 5, index + 2));
  const nextBilling = new Date(Date.UTC(2026, 10, 5 + index * 3));
  await Subscription.updateOne({ number: `SUB-${3001 + index}` }, { $set: { number: `SUB-${3001 + index}`, customerId: customer._id, planId: plan._id, productId: product._id, quantity, amount, billing: plan.interval, startDate: start, nextBillingDate: nextBilling, status } }, { upsert: true });
}

const subscriptions = await Subscription.find({ number: { $regex: /^SUB-30/ } });
for (let index = 0; index < subscriptions.length; index += 1) {
  const subscription = subscriptions[index];
  const customer = customers.find((item) => String(item._id) === String(subscription.customerId));
  if (!customer) continue;
  const amount = subscription.amount;
  const dueOn = new Date(Date.UTC(2026, 9, 10 + index));
  const plan = plans.find((item) => String(item._id) === String(subscription.planId));
  await Invoice.updateOne({ number: `INV-${4001 + index}` }, { $setOnInsert: { number: `INV-${4001 + index}`, customerId: customer._id, subscriptionId: subscription._id, amount, paidAmount: index % 4 === 0 ? amount : index % 3 === 0 ? Math.round(amount / 2) : 0, plan: plan?.name ?? 'Subscription plan', issuedOn: new Date(Date.UTC(2026, 8, 10 + index)), dueOn, status: index % 4 === 0 ? 'paid' : index % 3 === 0 ? 'partially_paid' : 'open' } }, { upsert: true });
}

const invoices = await Invoice.find({ number: { $regex: /^INV-40/ } });
for (const invoice of invoices.filter((item) => item.paidAmount > 0)) {
  const existing = await Payment.findOne({ invoiceId: invoice._id, reference: `SEED-${invoice.number}` });
  if (!existing) await Payment.create({ invoiceId: invoice._id, customerId: invoice.customerId, amount: invoice.paidAmount, method: invoice.paidAmount % 2 === 0 ? 'Card' : 'Bank transfer', reference: `SEED-${invoice.number}`, notes: 'Initial account payment', paidOn: invoice.issuedOn });
}

await removeDuplicates(User, 'email');
console.log(`Seed complete: ${customers.length} customers, ${plans.length} plans, ${products.length} products, ${subscriptions.length} subscriptions, ${invoices.length} invoices`);
await mongoose.disconnect();
