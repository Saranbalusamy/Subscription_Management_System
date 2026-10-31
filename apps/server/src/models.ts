import mongoose, { Schema } from 'mongoose';

const customerSchema = new Schema({ name: { type: String, required: true, trim: true }, email: { type: String, required: true, unique: true, lowercase: true, trim: true }, phone: String, company: String, address: String, customerType: { type: String, default: 'business' }, status: { type: String, enum: ['active', 'at-risk', 'inactive'], default: 'active' } }, { timestamps: true, versionKey: false });
const productSchema = new Schema({ name: { type: String, required: true }, type: String, price: { type: Number, min: 0, required: true }, active: { type: Boolean, default: true }, variants: [{ name: String, price: { type: Number, min: 0, default: 0 } }] }, { versionKey: false });
const planSchema = new Schema({ name: { type: String, required: true }, price: { type: Number, min: 0, required: true }, interval: { type: String, enum: ['Daily', 'Weekly', 'Monthly', 'Yearly'], required: true }, active: { type: Boolean, default: true } }, { versionKey: false });
const subscriptionSchema = new Schema({ number: { type: String, unique: true }, customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true }, planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true }, productId: { type: Schema.Types.ObjectId, ref: 'Product' }, quantity: { type: Number, min: 1, default: 1 }, amount: { type: Number, min: 0, required: true }, billing: { type: String, enum: ['Daily', 'Weekly', 'Monthly', 'Yearly'], required: true }, startDate: { type: Date, required: true }, expiryDate: Date, nextBillingDate: Date, status: { type: String, enum: ['active', 'paused', 'expiring', 'closed'], default: 'active' } }, { timestamps: true, versionKey: false });
const invoiceSchema = new Schema({ number: { type: String, unique: true }, customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true }, subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' }, amount: { type: Number, min: 0, required: true }, paidAmount: { type: Number, min: 0, default: 0 }, plan: String, issuedOn: { type: Date, default: Date.now }, dueOn: { type: Date, required: true }, status: { type: String, enum: ['paid', 'partially_paid', 'open', 'overdue', 'draft'], default: 'open' } }, { versionKey: false });
const paymentSchema = new Schema({ invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true }, customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true }, amount: { type: Number, min: 0, required: true }, method: { type: String, enum: ['Card', 'Bank transfer', 'UPI'], required: true }, reference: String, notes: String, paidOn: { type: Date, default: Date.now } }, { versionKey: false });
const userSchema = new Schema({ name: { type: String, required: true }, email: { type: String, unique: true, lowercase: true }, passwordHash: { type: String, required: true }, role: { type: String, enum: ['admin', 'staff', 'customer'], default: 'staff' }, customerId: { type: Schema.Types.ObjectId, ref: 'Customer' } }, { timestamps: true, versionKey: false });
planSchema.index({ name: 1 }, { unique: true });
productSchema.index({ name: 1 }, { unique: true });
paymentSchema.index({ invoiceId: 1, reference: 1 }, { unique: true, sparse: true });

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);
export const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export const User = mongoose.models.User || mongoose.model('User', userSchema);
