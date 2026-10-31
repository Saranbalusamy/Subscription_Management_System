import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Customer, Plan, Product, User } from './models.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? 'apps/server/.env' });
const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/brightloop';
await mongoose.connect(uri);
const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin!12345', 12);
await User.updateOne({ email: 'admin@brightloop.local' }, { $set: { name: 'Arjun Rao', email: 'admin@brightloop.local', passwordHash, role: 'admin' } }, { upsert: true });
await Plan.bulkWrite([
  { updateOne: { filter: { name: 'Growth' }, update: { $set: { name: 'Growth', price: 490, interval: 'Monthly', active: true } }, upsert: true } },
  { updateOne: { filter: { name: 'Scale' }, update: { $set: { name: 'Scale', price: 890, interval: 'Monthly', active: true } }, upsert: true } },
  { updateOne: { filter: { name: 'Enterprise' }, update: { $set: { name: 'Enterprise', price: 2490, interval: 'Monthly', active: true } }, upsert: true } }
]);
await Product.updateOne({ name: 'Brightloop Core' }, { $set: { name: 'Brightloop Core', type: 'SaaS platform', price: 490, active: true, variants: [{ name: 'Standard', price: 0 }, { name: 'Odoo connector', price: 560 }] } }, { upsert: true });
await Customer.updateOne({ email: 'demo@brightloop.local' }, { $set: { name: 'Demo Customer', email: 'demo@brightloop.local', company: 'Demo Company', status: 'active' } }, { upsert: true });
console.log('Seed complete. Admin: admin@brightloop.local / Admin!12345');
await mongoose.disconnect();
