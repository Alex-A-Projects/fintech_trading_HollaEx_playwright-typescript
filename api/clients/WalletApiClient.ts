/**
 * Wallet / balance API client.
 */
import { z } from 'zod';
import { BaseApiClient } from './BaseApiClient';
import { AuthApiClient } from './AuthApiClient';
import { PRIVATE_ENDPOINTS } from '@config/endpoints';
import { env, requireLocalOrTestnet } from '@config/environments';

export const BalanceSchema = z
  .object({
    currency: z.string(),
    available: z.number().nonnegative(),
    reserved: z.number().nonnegative().optional(),
    total: z.number().nonnegative(),
  })
  .passthrough();

export const BalancesEnvelopeSchema = z.union([
  z.array(BalanceSchema),
  z.record(z.string(), BalanceSchema),
]);

export class WalletApiClient extends BaseApiClient {
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

  async getBalances(): Promise<z.infer<typeof BalancesEnvelopeSchema>> {
    requireLocalOrTestnet('WalletApiClient.getBalances');
    const raw = await this.auth.signed(env.adminApiKey, env.adminApiSecret, {
      method: 'GET',
      path: PRIVATE_ENDPOINTS.userBalances.path,
    });
    // Normalize both array and map shapes
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && 'balances' in (raw as Record<string, unknown>)) {
      return (raw as { balances: unknown }).balances as z.infer<typeof BalancesEnvelopeSchema>;
    }
    return raw as z.infer<typeof BalancesEnvelopeSchema>;
  }
}
