import mongoose from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | undefined;

export async function connectDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not configured');
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10
  }).then((connection) => {
    console.log(`MongoDB connected: ${connection.connection.name}`);
    return connection;
  }).catch((connectionError) => {
    connectionPromise = undefined;
    console.error('MongoDB connection failed:', connectionError instanceof Error ? connectionError.message : connectionError);
    throw connectionError;
  });

  return connectionPromise;
}

export async function disconnectDatabase(): Promise<void> {
  connectionPromise = undefined;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
