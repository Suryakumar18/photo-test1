import mongoose, { Document, Schema } from "mongoose";

export type ActivityType =
  | "upload"
  | "event_created"
  | "face_match"
  | "download"
  | "view"
  | "login"
  | "storage_limit_set"
  | "studio_created"
  | "studio_suspended"
  | "studio_activated";

export interface IActivityLog extends Document {
  studioId: string;
  type: ActivityType;
  description: string;
  userId?: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  photoId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    studioId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "upload",
        "event_created",
        "face_match",
        "download",
        "view",
        "login",
        "storage_limit_set",
        "studio_created",
        "studio_suspended",
        "studio_activated",
      ],
      required: true,
    },
    description: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    photoId: { type: Schema.Types.ObjectId, ref: "Photo" },
    metadata: { type: Schema.Types.Mixed },
    ip: String,
  },
  { timestamps: true, versionKey: false }
);

ActivityLogSchema.index({ studioId: 1, createdAt: -1 });
ActivityLogSchema.index({ type: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 });

export const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
