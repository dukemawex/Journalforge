// apps/api/src/services/aiPipeline.ts
import { config } from '../config';
import { parserPrompt } from '../prompts/parserPrompt';
import { formatterPrompt } from '../prompts/formatterPrompt';
import { assemblerPrompt } from '../prompts/assemblerPrompt';
import { AIPipelineError } from '../middleware/errorHandler';
import {
  DocumentContent,
  ParsedDocument,
  FormattedDocument,
  AssemblyActionList,
} from '../types';

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  stageName: string
): Promise<unknown> {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(config.openrouterBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openrouterApiKey}`,
          'HTTP-Referer': config.frontendUrl,
          'X-Title': 'JournalForge',
        },
        body: JSON.stringify({
          model: config.aiModel,
          max_tokens: 4096,
          temperature: 0,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenRouter responded with status ${response.status}: ${errorBody}`
        );
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message: string };
      };

      if (json.error) {
        throw new Error(`OpenRouter API error: ${json.error.message}`);
      }

      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenRouter');
      }

      const cleaned = stripMarkdownFences(content);
      return JSON.parse(cleaned);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(
          `AI pipeline stage "${stageName}" attempt ${attempt} failed: ${lastError.message}. Retrying in ${backoffMs}ms…`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new AIPipelineError(
    `AI pipeline stage "${stageName}" failed after ${maxAttempts} attempts: ${lastError?.message}`,
    lastError
  );
}

export async function runParserStage(
  manuscriptContent: DocumentContent
): Promise<ParsedDocument> {
  const userMessage = JSON.stringify(manuscriptContent);
  const result = await callOpenRouter(parserPrompt, userMessage, 'Parser');
  return result as ParsedDocument;
}

export async function runFormatterStage(
  parsedDocument: ParsedDocument,
  journalSpecContent: DocumentContent
): Promise<FormattedDocument> {
  const userMessage = JSON.stringify({
    parsedDocument,
    journalSpecContent,
  });
  const result = await callOpenRouter(formatterPrompt, userMessage, 'Formatter');
  return result as FormattedDocument;
}

export async function runAssemblerStage(
  formattedDocument: FormattedDocument
): Promise<AssemblyActionList> {
  const userMessage = JSON.stringify(formattedDocument);
  const result = await callOpenRouter(assemblerPrompt, userMessage, 'Assembler');
  return result as AssemblyActionList;
}
