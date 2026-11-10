import { describe, it, expect } from 'vitest';
import { createSync, type SyncMessage } from './sync';

describe('sync', () => {
  it('delivers messages to other channel instances, not the sender', async () => {
    const a = createSync('test-channel');
    const b = createSync('test-channel');
    const selfGot: SyncMessage[] = [];
    a.subscribe((m) => selfGot.push(m));
    const got = new Promise<SyncMessage>((resolve) => b.subscribe(resolve));

    a.send({ type: 'request-state' });

    expect(await got).toEqual({ type: 'request-state' });
    expect(selfGot).toEqual([]);
    a.close();
    b.close();
  });

  it('stops delivering after unsubscribe', async () => {
    const a = createSync('test-channel-2');
    const b = createSync('test-channel-2');
    const calls: SyncMessage[] = [];
    const unsubscribe = b.subscribe((m) => calls.push(m));
    unsubscribe();
    const marker = new Promise<SyncMessage>((resolve) => b.subscribe(resolve));
    a.send({ type: 'request-state' });
    await marker;
    expect(calls).toEqual([]);
    a.close();
    b.close();
  });
});
