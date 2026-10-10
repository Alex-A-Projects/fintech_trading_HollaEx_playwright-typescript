/**
 * Exports the available page objects.
 *
 * NOTE: As of 2026-10-09 the only navigable URL on the HollaEx Pro UI from
 * the public production server is the React root `/`. Sub-routes like
 * `/markets`, `/login`, `/trade/{symbol}` return HTTP 404. Page objects for
 * those routes therefore describe their intended target selectors and are
 * usable against a local Kit deployment or a HollaEx Cloud environment where
 * the SPA fallback is configured.
 */
export { BasePage } from './BasePage';
export { PublicPage } from './PublicPage';
