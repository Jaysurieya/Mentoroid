const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema({
  materialId: { type: String, required: true },
  title: { type: String, default: "Untitled" },
  sourceType: { type: String, default: "pdf" },
  chunkCount: { type: Number, default: 0 },
  status: { type: String, enum: ["processing", "ready", "error"], default: "processing" },
  url: { type: String, default: "" },
  filePath: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const chatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  sources: [{
    materialId: String,
    title: String,
    sourceType: String,
    chunkText: String,
    page: Number,
  }],
  timestamp: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: { type: String, default: "Untitled Session" },
  materials: [materialSchema],
  chatHistory: [chatMessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update updatedAt on save
sessionSchema.pre("save", function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model("Session", sessionSchema);
