import { describe, expect, it } from 'vitest';
import { resolveAiBackend } from './ai-client';

describe('resolveAiBackend', () => {
  it('falls back to local GGUF when Anthropic is requested without a key', () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    expect(
      resolveAiBackend('anthropic', 'claude-sonnet-4-5-20250929'),
    ).toEqual({
      provider: 'local',
      model: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
    });

    if (previous === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = previous;
    }
  });

  it('replaces a Claude model id when the org is already on local', () => {
    expect(resolveAiBackend('local', 'claude-sonnet-4-5-20250929')).toEqual({
      provider: 'local',
      model: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
    });
  });
});
