import { createClient, type InsForgeClient } from '@insforge/sdk';

/**
 * InsForge Client Central Configuration & Environment Diagnostics
 *
 * Reads public connection parameters from Vite environment variables.
 * Strictly guards against secret leakage: service-role or administrative
 * credentials must NEVER enter the client-side browser bundle.
 */

const baseUrl = import.meta.env.VITE_INSFORGE_URL || 'http://localhost:7130';
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || '';

export const isProduction = Boolean(import.meta.env.PROD);

export const isInsForgeConfigured = Boolean(
  import.meta.env.VITE_INSFORGE_URL &&
  import.meta.env.VITE_INSFORGE_ANON_KEY &&
  import.meta.env.VITE_INSFORGE_ANON_KEY !== 'your-insforge-anon-key-here' &&
  import.meta.env.VITE_INSFORGE_ANON_KEY.trim().length > 10
);

export type ConnectionStatus = 'CONNECTED' | 'DEV_FALLBACK' | 'PROD_UNCONFIGURED';

export const connectionStatus: ConnectionStatus = isInsForgeConfigured
  ? 'CONNECTED'
  : isProduction
  ? 'PROD_UNCONFIGURED'
  : 'DEV_FALLBACK';

export const appEnvironment = {
  isProduction,
  isInsForgeConfigured,
  connectionStatus,
  baseUrl: isInsForgeConfigured ? baseUrl : 'local-storage-engine',
};

// Safe startup diagnostics (never prints secret keys or tokens)
if (isProduction && !isInsForgeConfigured) {
  console.error(
    '[DevCatalyst Hub Security Alert] Running in PRODUCTION mode without valid VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY. ' +
    'The platform is executing in unpersisted local fallback mode. Real cloud persistence is inactive.'
  );
} else if (!isInsForgeConfigured) {
  console.info(
    '[DevCatalyst Hub] Running in local development fallback mode with mock data engine. ' +
    'To connect a live InsForge backend, configure VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY in .env.local.'
  );
}

// Initialize official InsForge client with public anonymous credentials
export const insforge: InsForgeClient = createClient({
  baseUrl,
  anonKey: anonKey || undefined,
});

export default insforge;
