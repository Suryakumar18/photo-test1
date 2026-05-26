import mongoose, { Document, Schema } from "mongoose";

export interface IPlan extends Document {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
  cta: string;
  active: boolean;
  order: number;
}

const PlanSchema = new Schema<IPlan>(
  {
    name:        { type: String, required: true },
    price:       { type: Number, required: true },
    period:      { type: String, default: "/month" },
    description: { type: String, required: true },
    features:    [{ type: String }],
    popular:     { type: Boolean, default: false },
    cta:         { type: String, default: "Get Started" },
    active:      { type: Boolean, default: true },
    order:       { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Plan =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema);
