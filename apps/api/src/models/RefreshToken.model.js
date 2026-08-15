import mongoose from 'mongoose';

// Guarda el jti de cada refresh token para permitir rotación y revocación.
const refreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true, index: true }, // TTL independiente
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true },
    replacedBy: { type: String, default: null }, // jti de la rotación que lo sustituyó
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

refreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }, // mongod borra documentos expirados automáticamente
);

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;