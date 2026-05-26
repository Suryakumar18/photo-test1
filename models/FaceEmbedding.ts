import mongoose, { Document, Schema } from "mongoose";

/** Which ML backend generated this embedding. Determines vector dimension + distance metric. */
export type EmbeddingModelType = "faceapi" | "insightface";

export interface IFaceEmbedding extends Document {
  photoId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  embedding: number[];
  modelType: EmbeddingModelType;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  createdAt: Date;
}

const FaceEmbeddingSchema = new Schema<IFaceEmbedding>(
  {
    photoId:   { type: Schema.Types.ObjectId, ref: "Photo",  required: true, index: true },
    eventId:   { type: Schema.Types.ObjectId, ref: "Event",  required: true, index: true },
    embedding: { type: [Number], required: true },
    /** "faceapi" = 128-d FaceNet (euclidean).  "insightface" = 512-d ArcFace (cosine). */
    modelType: { type: String, enum: ["faceapi", "insightface"], default: "faceapi" },
    boundingBox: {
      x:      { type: Number, required: true },
      y:      { type: Number, required: true },
      width:  { type: Number, required: true },
      height: { type: Number, required: true },
    },
    confidence: { type: Number, required: true, min: 0, max: 1 },
  },
  { timestamps: true }
);

FaceEmbeddingSchema.index({ eventId: 1, modelType: 1 });
FaceEmbeddingSchema.index({ photoId: 1, eventId: 1 });

export const FaceEmbedding =
  mongoose.models.FaceEmbedding ||
  mongoose.model<IFaceEmbedding>("FaceEmbedding", FaceEmbeddingSchema);
