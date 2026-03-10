import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("MySQL database connected successfully.");
  } catch (error) {
    console.log(error);
  }
};

export default prisma;
