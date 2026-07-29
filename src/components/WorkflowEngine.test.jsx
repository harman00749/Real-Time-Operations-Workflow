import { describe, expect, it } from 'vitest';
import { getColumnStatus, getReconnectDelay, parseSocketMessage } from '../utils/workflow.js';

describe('WorkflowEngine helpers', () => {
  it('places approved and rejected tickets in the completed column', () => {
    expect(getColumnStatus('APPROVED')).toBe('COMPLETED');
    expect(getColumnStatus('REJECTED')).toBe('COMPLETED');
    expect(getColumnStatus('PENDING')).toBe('PENDING');
  });

  it('uses capped exponential backoff delays', () => {
    expect(getReconnectDelay(0)).toBe(1000);
    expect(getReconnectDelay(1)).toBe(2000);
    expect(getReconnectDelay(2)).toBe(4000);
    expect(getReconnectDelay(10)).toBe(16000);
  });

  it('parses only valid status update socket messages', () => {
    const payload = parseSocketMessage(
      JSON.stringify({ type: 'STATUS_UPDATE', taskId: 1, newStatus: 'APPROVED' }),
    );

    expect(payload).toEqual({ type: 'STATUS_UPDATE', taskId: 1, newStatus: 'APPROVED' });
    expect(parseSocketMessage('non-json echo greeting')).toBeNull();
    expect(parseSocketMessage(JSON.stringify({ type: 'JOIN_ROOM' }))).toBeNull();
  });
});
