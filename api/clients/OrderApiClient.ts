/**
 * Order / Trade API client.
 *
 * NOTE on safety: every operation here is gated on requireLocalOrTestnet().
 * Tests that attempt to place real orders against production are blocked at
 * runtime — there is no way to override that without changing the source.
 */
import { z } from 'zod';
import { BaseApiClient } from './BaseApiClient';
import { AuthApiClient } from './AuthApiClient';
import { PRIVATE_ENDPOINTS } from '@config/endpoints';
import { env, requireLocalOrTestnet } from '@config/environments';
import { ORDER_SIDES, ORDER_TYPES, OrderSide, OrderType } from '@config/test-data';

const OrderSideSchema = z.enum(ORDER_SIDES);
const OrderTypeSchema = z.enum(ORDER_TYPES);

export const OrderSchema = z
  .object({
    id: z.string().min(1),
    symbol: z.string(),
    side: OrderSideSchema,
    type: OrderTypeSchema,
    price: z.number().positive(),
    size: z.number().positive(),
    filled: z.number().nonnegative().optional(),
    remaining: z.number().nonnegative().optional(),
    status: z.enum(['new', 'filled', 'partially_filled', 'canceled', 'rejected']).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const OrderListSchema = z.union([z.array(OrderSchema), z.object({ orders: z.array(OrderSchema).optional() }).passthrough()]);

export interface CreateOrderPayload {
  symbol: string;
  side: OrderSide;
  size: number;
  type: OrderType;
  price?: number;
  /** HollaEx Kit `stop` field for stop-limit orders. Optional. */
  stop?: number;
}

export class OrderApiClient extends BaseApiClient {
  private readonly auth: AuthApiClient;

  constructor(opts: ConstructorParameters<typeof BaseApiClient>[0] = {}, auth?: AuthApiClient) {
    super(opts);
    this.auth = auth ?? new AuthApiClient(opts);
  }

  override async init() {
    await super.init();
    if (!this.auth.getAuthContext?.()) {
      await this.auth.init();
    }
    return this.ctx!;
  }

  async placeOrder(payload: CreateOrderPayload) {
    requireLocalOrTestnet('OrderApiClient.placeOrder');
    return this.auth.signed<z.infer<typeof OrderSchema>>(env.adminApiKey, env.adminApiSecret, {
      method: 'POST',
      path: PRIVATE_ENDPOINTS.order.path,
      body: payload as unknown as Record<string, unknown>,
      schema: OrderSchema,
    });
  }

  async placeOrderRaw(payload: Partial<CreateOrderPayload>): Promise<unknown> {
    requireLocalOrTestnet('OrderApiClient.placeOrderRaw');
    return this.auth.signed(env.adminApiKey, env.adminApiSecret, {
      method: 'POST',
      path: PRIVATE_ENDPOINTS.order.path,
      body: payload as Record<string, unknown>,
    });
  }

  async getOrderById(orderId: string) {
    requireLocalOrTestnet('OrderApiClient.getOrderById');
    return this.auth.signed<z.infer<typeof OrderSchema>>(env.adminApiKey, env.adminApiSecret, {
      method: 'GET',
      path: PRIVATE_ENDPOINTS.orderById.path,
      body: { order_id: orderId },
      schema: OrderSchema,
    });
  }

  async cancelOrder(orderId: string): Promise<unknown> {
    requireLocalOrTestnet('OrderApiClient.cancelOrder');
    return this.auth.signed(env.adminApiKey, env.adminApiSecret, {
      method: 'DELETE',
      path: PRIVATE_ENDPOINTS.cancelOrder.path,
      body: { order_id: orderId },
    });
  }

  async listOrders(): Promise<z.infer<typeof OrderListSchema>> {
    requireLocalOrTestnet('OrderApiClient.listOrders');
    return this.auth.signed<z.infer<typeof OrderListSchema>>(env.adminApiKey, env.adminApiSecret, {
      method: 'GET',
      path: PRIVATE_ENDPOINTS.userOrders.path,
      schema: OrderListSchema,
    });
  }
}
