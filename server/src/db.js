import mongoose from 'mongoose';

// Fail fast: the default 30s server selection wait makes a missing Mongo look like a hang.
export async function connect(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    // The hint covers the usual cause; the driver's error is kept for the cases it does not (bad URI, auth).
    throw new Error(`MongoDB tidak terjangkau di ${uri} — jalankan \`docker compose up -d\``, { cause: err });
  }
}

export async function disconnect() {
  await mongoose.disconnect();
}
