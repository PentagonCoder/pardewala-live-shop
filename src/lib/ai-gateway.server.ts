import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const RUN_ID_HEADER = 'X-Lovable-AIG-Run-ID';

function createRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

export async function getNotebookRecommendations(prompt: string, catalogue: string) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error('AI recommendations are not configured yet.');

  const gateway = createRunIdFetch();
  const provider = createOpenAI({
    baseURL: 'https://ai.gateway.lovable.dev/v1',
    apiKey,
    headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    fetch: gateway.fetch,
  });

  const result = streamText({
    model: provider.responses('openai/gpt-6-astra'),
    system: 'You are the Pardewala notebook finder. Recommend only catalogue IDs supplied in the user message. Reply as strict JSON with exactly two fields: "ids" (an array of up to three catalogue IDs) and "note" (a short friendly explanation under 45 words). Do not invent products, prices, availability, or IDs.',
    prompt: `Shopper needs: ${prompt}\n\nLive catalogue:\n${catalogue}`,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        store: false,
        include: ['reasoning.encrypted_content'],
      },
    },
  });

  return result.text;
}