"use client";
import { useInitiateCheckoutMutation } from "@/app/store/apis/CheckoutApi";
import React, { useMemo } from "react";
import useToast from "@/app/hooks/ui/useToast";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth";
import { useVerifyPaymentMutation } from "@/app/store/apis/TransactionApi";

interface CartSummaryProps {
  subtotal: number;
  shippingRate?: number;
  currency?: string;
  totalItems: number;
  cartId: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CartSummary: React.FC<CartSummaryProps> = ({
  subtotal,
  shippingRate = 0.01,
  currency = "₹",
  totalItems,
  address
}) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [initiateCheckout, { isLoading }] = useInitiateCheckoutMutation();

  const shippingFee = useMemo(
    () => subtotal * shippingRate,
    [subtotal, shippingRate]
  );

  const total = useMemo(
    () => subtotal + shippingFee,
    [subtotal, shippingFee]
  );

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleInitiateCheckout = async () => {
    try {
      const isLoaded = await loadRazorpayScript();

      if (!isLoaded) {
        showToast("Razorpay SDK failed to load", "error");
        return;
      }
      const street = address.street
      const city = address.city
      const country = address.country
      const zip = address.zip
      const state = address.state
      if (!address.street || !address.city || !address.country || !address.zip) {
        showToast("Please fill shipping address", "error");
        return;
      }
      const res = await initiateCheckout({street, zip, city, state, country}).unwrap();
      // await createAddress({
      //   orderId: res.orderId,
      //   ...address,
      // }).unwrap();

      const options = {
        key: res.key,
        amount: res.amount,
        currency: res.currency,
        order_id: res.orderId,
        name: "Zeelcut",
        description: "Order Payment",
        handler: async function (response: any) {
          try {
            debugger
            // 🔥 Call your backend to verify payment
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }).unwrap();

            showToast("Payment successful!", "success");
            window.location.href = "/orders";
          } catch {
            showToast("Payment verification failed", "error");
          }
        },
        prefill: {},
        theme: {
          color: "#4f46e5",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch {
      showToast("Failed to initiate checkout", "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-lg p-6 sm:p-8 border border-gray-200"
    >
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
        Order Summary
      </h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-700">
          <span>Total Items</span>
          <span>{totalItems}</span>
        </div>

        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span className="font-medium text-gray-800">
            {currency}
            {subtotal.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-gray-700">
          <span>Shipping ({(shippingRate * 100).toFixed(0)}%)</span>
          <span className="font-medium text-gray-800">
            {currency}
            {shippingFee.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between pt-3 border-t border-gray-200">
          <span className="font-semibold text-gray-800">Total</span>
          <span className="font-semibold text-gray-800">
            {currency}
            {total.toFixed(2)}
          </span>
        </div>
      </div>

      {isAuthenticated ? (
        <button
          disabled={isLoading || totalItems === 0}
          onClick={handleInitiateCheckout}
          className="mt-4 w-full bg-indigo-600 text-white py-2.5 rounded-md font-medium text-sm hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : "Proceed to Checkout"}
        </button>
      ) : (
        <Link
          href="/sign-in"
          className="mt-4 w-full inline-block text-center bg-gray-300 text-gray-800 py-2.5 rounded-md font-medium text-sm hover:bg-gray-400 transition-colors"
        >
          Sign in to Checkout
        </Link>
      )}
    </motion.div>
  );
};

export default CartSummary;