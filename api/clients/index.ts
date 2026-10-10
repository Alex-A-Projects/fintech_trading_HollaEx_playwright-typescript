/**
 * Public export barrel for API clients and shared schemas.
 */
export { BaseApiClient, ApiError } from './BaseApiClient';
export type { ApiClientOptions, QueryParams } from './BaseApiClient';
export { MarketApiClient } from './MarketApiClient';
export { AuthApiClient, UserInfoSchema } from './AuthApiClient';
export type { AuthContext, SignedHeadersOptions } from './AuthApiClient';
export { OrderApiClient, OrderSchema, OrderListSchema } from './OrderApiClient';
export type { CreateOrderPayload } from './OrderApiClient';
export { WalletApiClient, BalanceSchema, BalancesEnvelopeSchema } from './WalletApiClient';
