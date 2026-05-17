import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
    },
    secuencia: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    collection: "counters",
    versionKey: false,
  }
);

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;