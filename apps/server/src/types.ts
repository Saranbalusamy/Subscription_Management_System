export type Role = 'admin' | 'staff' | 'customer';
export type SubscriptionStatus = 'active' | 'paused' | 'expiring' | 'closed';
export type InvoiceStatus = 'paid' | 'open' | 'overdue' | 'draft';

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  plan: string;
  status: 'active' | 'at-risk' | 'inactive';
  mrr: number;
  joinedAt: string;
  initials: string;
}

export interface Subscription {
  id: string;
  number: string;
  customerId: string;
  customer: string;
  plan: string;
  status: SubscriptionStatus;
  amount: number;
  billing: 'Monthly' | 'Yearly';
  renewsOn: string;
}

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  plan: string;
  amount: number;
  status: InvoiceStatus;
  issuedOn: string;
  dueOn: string;
}

export interface Payment {
  id: string;
  customer: string;
  invoice: string;
  amount: number;
  method: 'Card' | 'Bank transfer' | 'UPI';
  paidOn: string;
}
