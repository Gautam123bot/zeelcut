import prisma from "@/infra/database/database.config";
import { ROLE } from "@prisma/client";
import { passwordUtils } from "@/shared/utils/authUtils";

export class UserRepository {
  async findAllUsers() {
    return await prisma.user.findMany();
  }

  async findUserById(id: string | undefined) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatar: true,
        role: true,
      },
    });
  }

  async findUserByPhone(phone: string) {
    return await prisma.user.findUnique({ where: { phone } });
  }

  async updateUser(
    id: string,
    data: Partial<{
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      avatar?: string;
      role?: ROLE;
      emailVerified?: boolean;
      resetPasswordToken?: string | null;
      resetPasswordTokenExpiresAt?: Date | null;
    }>
  ) {
    return await prisma.user.update({ where: { id }, data });
  }

  async deleteUser(id: string) {
    return await prisma.user.delete({ where: { id } });
  }

  async countUsersByRole(role: string) {
    return await prisma.user.count({
      where: { role: role as any },
    });
  }

  async createUser(data: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    role: string;
  }) {
    // Hash the password before storing
    const hashedPassword = await passwordUtils.hashPassword(data.password);

    return await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        role: data.role as any,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
    });
  }
}
