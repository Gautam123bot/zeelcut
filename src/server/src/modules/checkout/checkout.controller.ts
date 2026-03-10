import { Request, Response } from "express";
import asyncHandler from "@/shared/utils/asyncHandler";
import sendResponse from "@/shared/utils/sendResponse";
import { CheckoutService } from "./checkout.service";
import AppError from "@/shared/errors/AppError";
import { CartService } from "../cart/cart.service";
import { makeLogsService } from "../logs/logs.factory";

export class CheckoutController {
  private logsService = makeLogsService();

  constructor(
    private checkoutService: CheckoutService,
    private cartService: CartService
  ) {}

  initiateCheckout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(400, "User not found");
    }
    const { street, city, state, country, zip } = req.body;
    if (!street || !city || !country || !zip) {
      throw new AppError(400, "Shipping address is required");
    }

    const cart = await this.cartService.getOrCreateCart(userId);

    if (!cart.cartItems || cart.cartItems.length === 0) {
      throw new AppError(400, "Cart is empty");
    }

    const razorpayOrder = await this.checkoutService.createRazorpayOrder(cart, userId, { street, city, state, country, zip });

    sendResponse(res, 200, {
      data: {
        orderId: razorpayOrder.orderId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: razorpayOrder.key,
      },
      message: "Checkout initiated successfully",
    });

    // Log cart event
    await this.cartService.logCartEvent(
      cart.id,
      "CHECKOUT_STARTED",
      userId
    );

    // Log system event
    this.logsService.info("Checkout initiated", {
      userId,
      orderId: razorpayOrder.orderId,
      amount: razorpayOrder.amount,
      timePeriod: 0,
    });
  });
}