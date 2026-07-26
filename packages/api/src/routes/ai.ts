import { Hono } from 'hono';
import { SYSTEM_PROMPT_CURRENT } from '../ai/prompts';
import { parseSystemDraft, AIParseError } from '../ai/parse';

const aiRouter = new Hono<{ Bindings: CloudflareBindings }>();

aiRouter.post('/draft-system', async (c) => {
  const body = await c.req.json<{ prompt: string }>();
  if (!body.prompt || body.prompt.trim().length < 5) {
    return c.json({ error: 'invalid_input', message: 'Prompt is too short.' }, 400);
  }
  if (body.prompt.trim().length > 400) {
    return c.json({ error: 'invalid_input', message: 'Prompt is too long.' }, 400);
  }

  let aiRawResponse: string;
  try {
    const result = await c.env.AI.run(
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_CURRENT },
          { role: 'user', content: body.prompt.trim() }
        ],
        max_tokens: 1024,
      }
    ) as { response: string };
    aiRawResponse = result.response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('4006') || message.includes('neuron')) {
      return c.json({
        error: 'ai_unavailable',
        message: 'AI assist is unavailable today. You can still create your system manually, all fields are editable.'
      }, 503);
    }
    console.error('[AI] Workers AI call failed:', message);
    return c.json({ error: 'ai_error', message: 'AI call failed. Try again.' }, 502);
  }

  try {
    const draft = parseSystemDraft(aiRawResponse);
    return c.json({ draft });
  } catch (err) {
    if (err instanceof AIParseError) {
      console.error('[AI] Parse failed:', err.message, '| raw (500ch):', err.rawResponse.slice(0, 500));
    }
    return c.json({
      error: 'ai_parse_failed',
      message: 'AI returned an unexpected response. Try again, or create your system manually.'
    }, 502);
  }
});

export { aiRouter };