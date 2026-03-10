import {
  PrismaClient,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  CART_STATUS,
} from "@prisma/client";
import AppError from "@/shared/errors/AppError";
import redisClient from "@/infra/cache/redis";
import { makeLogsService } from "../logs/logs.factory";
import { CartService } from "../cart/cart.service";
import { CartRepository } from "../cart/cart.repository";

const prisma = new PrismaClient();

export class WebhookService {
  private logsService = makeLogsService();
  private repo = new CartRepository();
  private cartService = new CartService(this.repo);

  private async calculateOrderAmount(cart: any) {
    return cart.cartItems.reduce(
      (sum: number, item: any) =>
        sum + item.variant.price * item.quantity,
      0
    );
  }

  /**
   * 🔥 Handle Razorpay payment.captured webhook
   */
  async handlePaymentCaptured(payment: any) {
    const paymentId = payment.id;
    const razorpayOrderId = payment.order_id;

    // ✅ Prevent duplicate processing
    const existingOrder = await prisma.order.findFirst({
      where: { id: razorpayOrderId },
    });

    if (existingOrder) {
      this.logsService.info("Webhook - Duplicate Razorpay event ignored", {
        paymentId,
      });

      return {
        order: existingOrder,
        payment: null,
        transaction: null,
        shipment: null,
        address: null,
      };
    }

    // 🔎 Get metadata from notes
    const userId = payment.notes?.userId;
    const cartId = payment.notes?.cartId;
    const street = payment.notes?.street;
    const city = payment.notes?.city;
    const state = payment.notes?.state;
    const country = payment.notes?.country;
    const zip = payment.notes?.zip;

    if (!userId || !cartId) {
      throw new AppError(
        400,
        "Missing userId or cartId in Razorpay payment notes"
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        cartItems: {
          include: {
            variant: { include: { product: true } },
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new AppError(400, "Cart is empty or not found");
    }

    const amount = await this.calculateOrderAmount(cart);

    // Razorpay amount is in paise
    if (Math.abs(amount - payment.amount / 100) > 0.01) {
      throw new AppError(
        400,
        "Amount mismatch between cart and Razorpay payment"
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // ✅ Validate stock
      for (const item of cart.cartItems) {
        if (item.variant.stock < item.quantity) {
          throw new AppError(
            400,
            `Insufficient stock for variant ${item.variant.sku}`
          );
        }
      }

      // 🧾 Create Order
      const order = await tx.order.create({
        data: {
          id: razorpayOrderId, // use Razorpay order ID
          userId,
          amount,
          orderItems: {
            create: cart.cartItems.map((item: any) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.variant.price,
            })),
          },
        },
      });

      // 💳 Create Payment
      const paymentRecord = await tx.payment.create({
        data: {
          orderId: order.id,
          userId,
          method: payment.method || "razorpay",
          amount,
          status: PAYMENT_STATUS.PAID,
        },
      });

      // 🔁 Transaction
      const transaction = await tx.transaction.create({
        data: {
          orderId: order.id,
          status: TRANSACTION_STATUS.PENDING,
          transactionDate: new Date(),
        },
      });

      // 🚚 Shipment
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier:
            "Carrier_" + Math.random().toString(36).substring(2, 10),
          trackingNumber: Math.random().toString(36).substring(2),
          shippedDate: new Date(),
          deliveryDate: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ),
        },
      });

      // 📦 Update stock + sales
      for (const item of cart.cartItems) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: {
            stock: true,
            product: { select: { id: true, salesCount: true } },
          },
        });

        if (!variant) {
          throw new AppError(
            404,
            `Variant not found: ${item.variantId}`
          );
        }

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: variant.stock - item.quantity },
        });

        await tx.product.update({
          where: { id: variant.product.id },
          data: {
            salesCount:
              variant.product.salesCount + item.quantity,
          },
        });
      }

      // 🛒 Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: CART_STATUS.CONVERTED },
      });

      const address = await tx.address.create({
        data: {
          orderId: order.id,
          userId,
          street,
          city,
          state,
          country,
          zip
        },
      });

      return {
        order,
        payment: paymentRecord,
        transaction,
        shipment,
        address, // Razorpay does not auto-send address
      };
    });

    // 🧹 Clear dashboard cache
    await redisClient.del("dashboard:year-range");
    const keys = await redisClient.keys("dashboard:stats:*");
    if (keys.length > 0) await redisClient.del(keys);

    this.cartService.logCartEvent(
      cart.id,
      "CHECKOUT_COMPLETED",
      userId
    );

    this.logsService.info(
      "Webhook - Razorpay order processed successfully",
      {
        userId,
        orderId: result.order.id,
        amount,
      }
    );

    return result;
  }
}