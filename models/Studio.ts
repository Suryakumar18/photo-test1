import mongoose, { Document, Schema } from "mongoose";

export type StudioPlan = "trial" | "starter" | "professional" | "enterprise";
export type StudioStatus = "active" | "suspended" | "trial" | "pending";

export interface IStudio extends Document {
  studioId: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  address?: string;
  logo?: string;
  plan: StudioPlan;
  status: StudioStatus;
  storageLimit: number;
  storageUsed: number;
  photosCount: number;
  eventsCount: number;
  usersCount: number;
  settings: {
    allowFaceMatch: boolean;
    allowPublicGallery: boolean;
    customDomain?: string;
    watermark?: string;
    watermarkEnabled: boolean;
  };
  subscription: {
    startDate: Date;
    endDate?: Date;
    autoRenew: boolean;
  };
  /** Billing / payment-cycle data */
  billing: {
    planPrice: number;       // Amount per 28-day cycle (INR)
    currency: string;        // "INR"
    billingCycleDays: number;// Default 28
    nextDueDate: Date;       // When the next payment is due
    lastPaidDate?: Date;     // When the last payment was received
  };
  lastActivity?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudioSchema = new Schema<IStudio>(
  {
    studioId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    address: String,
    logo: String,
    plan: {
      type: String,
      enum: ["trial", "starter", "professional", "enterprise"],
      default: "trial",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "trial", "pending"],
      default: "trial",
    },
    storageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 },
    storageUsed: { type: Number, default: 0 },
    photosCount: { type: Number, default: 0 },
    eventsCount: { type: Number, default: 0 },
    usersCount: { type: Number, default: 1 },
    settings: {
      allowFaceMatch: { type: Boolean, default: true },
      allowPublicGallery: { type: Boolean, default: true },
      customDomain: String,
      watermark: String,
      watermarkEnabled: { type: Boolean, default: false },
    },
    subscription: {
      startDate: { type: Date, default: Date.now },
      endDate: Date,
      autoRenew: { type: Boolean, default: false },
    },
    billing: {
      planPrice:       { type: Number, default: 0 },
      currency:        { type: String, default: "INR" },
      billingCycleDays:{ type: Number, default: 28 },
      nextDueDate:     { type: Date, default: () => new Date(Date.now() + 28 * 24 * 60 * 60 * 1000) },
      lastPaidDate:    Date,
    },
    lastActivity: Date,
    notes: String,
  },
  { timestamps: true }
);

StudioSchema.index({ status: 1 });
StudioSchema.index({ plan: 1 });
StudioSchema.index({ createdAt: -1 });

export const Studio =
  mongoose.models.Studio || mongoose.model<IStudio>("Studio", StudioSchema);
