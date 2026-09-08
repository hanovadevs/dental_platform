import { describe, it, expect, beforeEach } from 'vitest';
import { eventBus } from '@/lib/events';

describe('Domain Event Bus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('emits events to subscribed handlers', async () => {
    let received: unknown = null;

    eventBus.on('test.event', async (data) => {
      received = data;
    });

    await eventBus.emit('test.event', { id: '123' });
    expect(received).toEqual({ id: '123' });
  });

  it('supports multiple handlers for the same event', async () => {
    const calls: number[] = [];

    eventBus.on('test.multi', async () => { calls.push(1); });
    eventBus.on('test.multi', async () => { calls.push(2); });

    await eventBus.emit('test.multi', {});
    expect(calls).toEqual([1, 2]);
  });

  it('does not call handlers for unrelated events', async () => {
    let called = false;

    eventBus.on('other.event', async () => { called = true; });

    await eventBus.emit('test.event', {});
    expect(called).toBe(false);
  });

  it('handles handler errors gracefully', async () => {
    let secondCalled = false;

    eventBus.on('test.error', async () => {
      throw new Error('Handler failure');
    });
    eventBus.on('test.error', async () => {
      secondCalled = true;
    });

    // Should not throw — errors are logged but don't block other handlers
    await eventBus.emit('test.error', {});
    expect(secondCalled).toBe(true);
  });

  it('clears all subscriptions', async () => {
    let called = false;
    eventBus.on('test.clear', async () => { called = true; });

    eventBus.clear();
    await eventBus.emit('test.clear', {});
    expect(called).toBe(false);
  });
});
