import { Connection, Commitment, ConnectionConfig } from '@solana/web3.js';

export type Cluster = 'localnet' | 'devnet' | 'mainnet-beta';

const CLUSTER = (process.env.NEXT_PUBLIC_CLUSTER as Cluster) || 'localnet';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8899';

const COMMITMENT: Commitment = 'confirmed';

const connectionConfig: ConnectionConfig = {
  commitment: COMMITMENT,
  wsEndpoint: getWsEndpoint(RPC_URL),
};

/**
 * Get WebSocket endpoint from HTTP RPC URL
 */
function getWsEndpoint(httpUrl: string): string | undefined {
  if (httpUrl.includes('127.0.0.1') || httpUrl.includes('localhost')) {
    return httpUrl.replace('http', 'ws');
  }
  // For devnet/mainnet, the WS endpoint is usually the same URL with wss
  if (httpUrl.includes('https')) {
    return httpUrl.replace('https', 'wss');
  }
  return undefined;
}

/**
 * Create a new Solana connection
 */
export function createConnection(): Connection {
  return new Connection(RPC_URL, connectionConfig);
}

/**
 * Singleton connection instance
 */
let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = createConnection();
  }
  return connection;
}

export { CLUSTER, RPC_URL, COMMITMENT };
