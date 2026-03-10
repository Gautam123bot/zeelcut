import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { CartService } from "../cart/cart.service";
import { CartRepository } from "../cart/cart.repository";

export const makeCheckoutController = () => {
  const checkoutService = new CheckoutService();
  const repo = new CartRepository();
  const cartService = new CartService(repo);
  const controller = new CheckoutController(checkoutService, cartService);
  return controller;
};
