import prisma from "@/infra/database/database.config";
import { TRANSACTION_STATUS } from "@prisma/client";

export class TransactionRepository {
  constructor() { }
  async findMany() {
    return prisma.transaction.findMany();
  }

  async findById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            payment: true,
            shipment: true,
            user: true,
            address: true,
            orderItems: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      category: true,
                      reviews: true,
                    },
                  },
                  attributes: {
                    include: {
                      attribute: true,
                      value: true,
                    },
                  },
                },
              },
            },},
          },
        },
      },
    });
  }

  async createTransaction(data: any) {
    return prisma.transaction.create({
      data,
    });
  }

  async updateTransaction(id: string, data: { status: TRANSACTION_STATUS }) {
    return prisma.transaction.update({
      where: { id },
      data,
    });
  }

  async deleteTransaction(id: string) {
    return prisma.transaction.delete({
      where: { id },
    });
  }
}
