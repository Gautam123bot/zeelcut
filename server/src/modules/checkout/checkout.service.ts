import AppError from "@/shared/errors/AppError";
import prisma from "@/infra/database/database.config";
import razorpay from "../../infra/payment/razorpay";

export class CheckoutService {
  constructor() { }

  async createRazorpayOrder(cart: any, userId: string, address: { street: string; city: string; state?: string; country: string; zip: string; }) {
    const { street, city, state, country, zip } = address;
    // 1️⃣ Validate stock
    for (const item of cart.cartItems) {
      if (item.variant.stock < item.quantity) {
        throw new AppError(
          400,
          `Insufficient stock for variant ${item.variant.sku}: only ${item.variant.stock} available`
        );
      }
    }

    // 2️⃣ Calculate total amount (INR assumed)
    const totalAmount = cart.cartItems.reduce(
      (acc: number, item: any) =>
        acc + item.variant.price * item.quantity,
      0
    );

    if (totalAmount <= 0) {
      throw new AppError(400, "Cart total must be greater than 0");
    }

    // 3️⃣ Create Razorpay Order
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // convert to paise
        currency: "INR",
        receipt: `rc_${cart.id}`,
        notes: {
          userId,
          cartId: cart.id,
          street,
          city,
          state: state ?? null,
          country,
          zip,
          items: JSON.stringify(
            cart.cartItems.map((item: any) => ({
              productName: item.variant.product.name,
              sku: item.variant.sku,
              quantity: item.quantity,
              variantId: item.variantId,
            }))
          ),
        },
      });
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID, // send this to frontend
      };
    } catch (error: any) {
      console.error("Razorpay order creation failed:", error?.error || error);
      throw new AppError(500, "Failed to create Razorpay order");
    }

  }
}