import type { AppConfig } from "./config.js";

export interface CheckoutFault {
  afterOrderPublished(input: {
    idempotencyKey: string;
    productId: string;
  }): Promise<boolean>;
}

const pause = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const createCheckoutFault = (
  config: Pick<
    AppConfig,
    | "checkoutAmbiguousFailureDelayMs"
    | "checkoutAmbiguousFailureProductPrefix"
    | "checkoutAmbiguousFailuresEnabled"
  >,
): CheckoutFault => {
  const delayedKeys = new Set<string>();

  return {
    afterOrderPublished: async ({ idempotencyKey, productId }) => {
      if (
        !config.checkoutAmbiguousFailuresEnabled ||
        !productId.startsWith(config.checkoutAmbiguousFailureProductPrefix) ||
        delayedKeys.has(idempotencyKey)
      ) {
        return false;
      }

      delayedKeys.add(idempotencyKey);
      await pause(config.checkoutAmbiguousFailureDelayMs);
      return true;
    },
  };
};
