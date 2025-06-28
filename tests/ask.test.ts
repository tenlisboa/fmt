import { describe, it, expect, vi } from 'vitest';
import { handler as askHandler } from '../commands/ask';

describe('ask command', () => {
  it('handles a basic question', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await askHandler({ question: "How is Alice doing?" });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("🤖"));
    spy.mockRestore();
  });
});
