import mongoose, { Document, Schema } from "mongoose";

export type InvoiceStatus = "pending" | "paid" | "overdue";

export interface IInvoice extends Document {
  invoiceNumber: string;   // INV-STD-ABC123-202501-001
  studioId: string;
  studioName: string;
  ownerEmail: string;
  periodStart: Date;
  periodEnd: Date;          // periodStart + 28 days
  dueDate: Date;
  amount: number;           // in INR (or currency)
  currency: string;
  status: InvoiceStatus;
  paidAt?: Date;
  transactionId?: string;
  paidAmount?: number;
  markedPaidBy?: string;    // super-admin email
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    studioId:      { type: String, required: true, index: true },
    studioName:    { type: String, required: true },
    ownerEmail:    { type: String, required: true },
    periodStart:   { type: Date, required: true },
    periodEnd:     { type: Date, required: true },
    dueDate:       { type: Date, required: true },
    amount:        { type: Number, required: true },
    currency:      { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },
    paidAt:        Date,
    transactionId: String,
    paidAmount:    Number,
    markedPaidBy:  String,
    notes:         String,
  },
  { timestamps: true }
);

InvoiceSchema.index({ studioId: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });

export const Invoice =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
