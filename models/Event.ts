import mongoose, { Document, Schema } from "mongoose";

export interface IEvent extends Document {
  title: string;
  slug: string;
  brideName: string;
  groomName: string;
  eventDate: Date;
  location: string;
  coverImage?: string;
  coverImageCDN?: string;
  description?: string;
  photographers: mongoose.Types.ObjectId[];
  qrCode?: string;
  shareUrl: string;
  status: "upcoming" | "live" | "completed" | "archived";
  photosCount: number;
  videosCount: number;
  viewsCount: number;
  faceMatchCount: number;
  storageUsed: number;
  isPublic: boolean;
  password?: string;
  tags?: string[];
  studioId?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    brideName: { type: String, required: true, trim: true },
    groomName: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    coverImage: { type: String },
    coverImageCDN: { type: String },
    description: { type: String },
    photographers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    qrCode: { type: String },
    shareUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["upcoming", "live", "completed", "archived"],
      default: "upcoming",
    },
    photosCount: { type: Number, default: 0 },
    videosCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    faceMatchCount: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    password: { type: String },
    tags: [{ type: String }],
    studioId: { type: String, index: true },
    createdBy: { type: Schema.Types.Mixed, required: false },
  },
  { timestamps: true }
);

// slug is unique:true in schema so no extra index needed; status/date are standalone
EventSchema.index({ status: 1, eventDate: -1 });
EventSchema.index({ studioId: 1, createdAt: -1 });

export const Event = mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);
