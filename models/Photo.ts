import mongoose, { Document, Schema } from "mongoose";

export interface IPhoto extends Document {
  eventId: mongoose.Types.ObjectId;
  studioId?: string;
  filename: string;
  originalName: string;
  storagePath: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size: number;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId;
  tags?: string[];
  favorites: number;
  downloads: number;
  isProcessed: boolean;
  hasFaces: boolean;
  faceCount: number;
  metadata?: {
    camera?: string;
    lens?: string;
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    takenAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    studioId: { type: String, index: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    storagePath: { type: String, required: true },
    cdnUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    width: { type: Number },
    height: { type: Number },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "image/jpeg" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: String }],
    favorites: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    isProcessed: { type: Boolean, default: false },
    hasFaces: { type: Boolean, default: false },
    faceCount: { type: Number, default: 0 },
    metadata: {
      camera: String,
      lens: String,
      iso: Number,
      aperture: String,
      shutterSpeed: String,
      takenAt: Date,
    },
  },
  { timestamps: true }
);

// Compound indexes — eventId:1 alone is covered by the compound indexes below
PhotoSchema.index({ eventId: 1, createdAt: -1 });
PhotoSchema.index({ eventId: 1, hasFaces: 1 });
PhotoSchema.index({ studioId: 1, createdAt: -1 });

export const Photo = mongoose.models.Photo || mongoose.model<IPhoto>("Photo", PhotoSchema);
