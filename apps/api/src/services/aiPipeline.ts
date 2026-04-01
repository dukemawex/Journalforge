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

function safeJsonTruncate(raw: string): string {
  // Scan backwards through every } and ] position and return the first
  // substring that parses as valid JSON.  This handles the case where a
  // closing brace/bracket appears AFTER an unterminated string (e.g.
  // `"content": "text cut off here}`), which a simple lastIndexOf cannot
  // detect.
  for (let i = raw.length - 1; i >= 0; i--) {
    const ch = raw[i];
    if (ch === '}' || ch === ']') {
      const candidate = raw.substring(0, i + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        // This position sits inside or after an incomplete token; keep scanning.
      }
    }
  }
  // No valid JSON boundary found — return the original string and let the
  // caller's JSON.parse produce a meaningful error.
  return raw;
}

function repairPossiblyTruncatedJson(raw: string): string {
  let repaired = '';
  const stack: Array<'{' | '['> = [];
  let inString = false;
  let escaped = false;

  for (const ch of raw) {
    repaired += ch;

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }

    if (ch === '}' || ch === ']') {
      const expectedOpen = ch === '}' ? '{' : '[';
      if (stack[stack.length - 1] === expectedOpen) {
        stack.pop();
      }
    }
  }

  if (inString) {
    repaired += '"';
  }

  repaired = repaired.replace(/,\s*$/, '').replace(/,\s*([}\]])/g, '$1');

  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']';
  }

  return repaired;
}

function tryRecoverJson(raw: string, parseError: SyntaxError): unknown {
  const positionMatch = parseError.message.match(/position (\d+)/);
  const candidatePrefixes: string[] = [];

  if (positionMatch) {
    const position = Number(positionMatch[1]);
    if (Number.isFinite(position) && position > 0) {
      candidatePrefixes.push(raw.substring(0, position));
      candidatePrefixes.push(raw.substring(0, position + 1));
    }
  }

  candidatePrefixes.push(raw);

  for (const candidate of candidatePrefixes) {
    const truncated = safeJsonTruncate(candidate);
    const repaired = repairPossiblyTruncatedJson(truncated);
    try {
      return JSON.parse(repaired);
    } catch {
      // Try next candidate.
    }
  }

  throw parseError;
}

async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  stageName: string,
  maxTokens: number
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
          max_tokens: maxTokens,
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
      const truncated = safeJsonTruncate(cleaned);

      try {
        return JSON.parse(truncated);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          return tryRecoverJson(truncated, parseError);
        }
        throw parseError;
      }
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
  const truncatedManuscript = {
    ...manuscriptContent,
    rawText: manuscriptContent.rawText.substring(0, 12000),
    referencesBlock: manuscriptContent.referencesBlock.substring(0, 3000),
  };
  const userMessage = JSON.stringify(truncatedManuscript);
  const result = await callOpenRouter(parserPrompt, userMessage, 'Parser', 8192);
  return result as ParsedDocument;
}

export async function runFormatterStage(
  parsedDocument: ParsedDocument,
  journalSpecContent: DocumentContent
): Promise<FormattedDocument> {
  const truncatedJournalSpec = {
    ...journalSpecContent,
    rawText: journalSpecContent.rawText.substring(0, 6000),
  };
  const userMessage = JSON.stringify({
    parsedDocument,
    journalSpecContent: truncatedJournalSpec,
  });
  const result = await callOpenRouter(formatterPrompt, userMessage, 'Formatter', 6144);
  return result as FormattedDocument;
}

export async function runAssemblerStage(
  formattedDocument: FormattedDocument
): Promise<AssemblyActionList> {
  const userMessage = JSON.stringify(formattedDocument);
  const result = await callOpenRouter(assemblerPrompt, userMessage, 'Assembler', 6144);
  return result as AssemblyActionList;
}
