import prisma from "@/infra/database/database.config";
import { ROLE } from "@prisma/client";

export class AuthRepository {
  async findUserByPhone(phone: string) {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  async findUserByPhoneWithPassword(phone: string) {
    return prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        password: true,
        role: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
      },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
      },
    });
  }

  async createUser(data: {
    phone: string;
    email?: string;
    name: string;
    password: string;
    role: ROLE;
  }) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
      },
    });
  }

  async updateUserEmailVerification(
    userId: string,
    data: {
      phoneVerificationToken: string | null;
      phoneVerificationTokenExpiresAt: Date | null;
      phoneVerified?: boolean;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updateUserPasswordReset(
    phone: string,
    data: {
      resetPasswordToken?: string | null;
      resetPasswordTokenExpiresAt?: Date | null;
      password?: string;
    }
  ) {
    return prisma.user.update({
      where: { phone },
      data,
    });
  }

  async findUserByResetToken(hashedToken: string) {
    return prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpiresAt: { gt: new Date() },
      },
    });
  }

  async updateUserPassword(userId: string, password: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        password,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
      },
    });
  }
}
