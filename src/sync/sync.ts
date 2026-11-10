import type { Dungeon } from '../model/types';

export type SyncMessage = { type: 'request-state' } | { type: 'state'; dungeon: Dungeon } | { type: 'clear' };

export interface Sync {
  send(msg: SyncMessage): void;
  subscribe(fn: (msg: SyncMessage) => void): () => void;
  close(): void;
}

export const CHANNEL_NAME = 'dungeon-runner-sync';

export function createSync(name: string = CHANNEL_NAME): Sync {
  const channel = new BroadcastChannel(name);
  const listeners = new Set<(msg: SyncMessage) => void>();
  channel.onmessage = (e: MessageEvent) => {
    listeners.forEach((fn) => fn(e.data as SyncMessage));
  };
  return {
    send: (msg) => channel.postMessage(msg),
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    close: () => channel.close(),
  };
}
