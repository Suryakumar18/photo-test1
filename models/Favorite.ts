import mongoose, { Document, Schema } from "mongoose";

export interface IFavorite extends Document {
  sessionId: string;
  photoId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    sessionId: { type: String, required: true, index: true },
    photoId: { type: Schema.Types.ObjectId, ref: "Photo", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  },
  { timestamps: true }
);

FavoriteSchema.index({ sessionId: 1, photoId: 1 }, { unique: true });

export const Favorite =
  mongoose.models.Favorite || mongoose.model<IFavorite>("Favorite", FavoriteSchema);
