import { apiSlice } from "../slices/ApiSlice";

export const checkoutApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    initiateCheckout: builder.mutation({
      query: ({street, zip, city, state, country}) => ({
        url: "/checkout",
        method: "POST",
        body: {street, zip, city, state, country},
        credentials: "include",
      }),
    }),
  }),
});

export const { useInitiateCheckoutMutation } = checkoutApi;
