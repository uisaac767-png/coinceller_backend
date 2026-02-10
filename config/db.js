import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await 
mongoose.connect(process.env.MONGO_URI);
    console.log("mongoDB Connected Successfully");
 } catch (error) {
   console.error("MongoDB CONNECTION ERROR:", error.message);
   process.exit(1);
 }
};

export default connectDB;
