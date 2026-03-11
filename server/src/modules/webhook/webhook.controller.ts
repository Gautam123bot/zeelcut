import razorpay from "@/infra/payment/razorpay";
import { Request, Response } from "express";
import asyncHandler from "@/shared/utils/asyncHandler";
import sendResponse from "@/shared/utils/sendResponse";
import { WebhookService } from "./webhook.service";
import { makeLogsService } from "../logs/logs.factory";
import crypto from "crypto";
import AppError from "@/shared/errors/AppError";

export class WebhookController {
  private logsService = makeLogsService();

  constructor(private webhookService: WebhookService) {}

  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["x-razorpay-signature"] as string;

    if (!signature) {
      throw new AppError(400, "No Razorpay signature found");
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    // 🔐 Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (expectedSignature !== signature) {
      throw new AppError(400, "Invalid Razorpay webhook signature");
    }

    const event = req.body;

    // ✅ Handle successful payment
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      await this.webhookService.handlePaymentCaptured(payment);

      this.logsService.info("Payment captured via webhook", {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
      });
    }

    sendResponse(res, 200, {
      message: "Webhook received successfully",
    });
  });

  verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      throw new AppError(400, "Missing Razorpay payment fields");
    }

    const secret = process.env.RAZORPAY_KEY_SECRET!;

    // 🔐 Create expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // ❌ Signature mismatch
    if (expectedSignature !== razorpay_signature) {
      throw new AppError(400, "Invalid Razorpay signature");
    }

    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    const razorpayOrder = await razorpay.orders.fetch(
      razorpay_order_id
    );

    const payment = {
      id: razorpayPayment.id,
      order_id: razorpayPayment.order_id,
      method: razorpayPayment.method,
      amount: razorpayPayment.amount,
      notes: razorpayOrder.notes, // ✅ IMPORTANT
    };

    // 🔥 Process order using same logic as webhook
    const result =
      await this.webhookService.handlePaymentCaptured(payment);

    sendResponse(res, 200, {
      message: "Payment verified successfully",
      data: {
        orderId: result.order.id,
      },
    });
  });

}