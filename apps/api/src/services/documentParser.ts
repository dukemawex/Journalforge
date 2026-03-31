import path from 'path';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { downloadFromSpaces } from './fileStorage';
import { DocumentContent } from '../types';

// Basic OMML to LaTeX mapping for common constructs
function ommlToLatex(omml: string): string {
  return omml
    .replace(/<m:r[^>]*>.*?<m:t[^>]*>(.*?)<\/m:t>.*?<\/m:r>/gs, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function parseDocx(key: string): Promise<DocumentContent> {
  const buffer = await downloadFromSpaces(key);

  // Extract text with structural hints via mammoth
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value;

  // Detect headings via mammoth messages and heuristic (short lines at start of paragraph)
  const headings: string[] = [];
  const lines = rawText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (
      line.length > 0 &&
      line.length < 80 &&
      !line.endsWith('.') &&
      (line === line.toUpperCase() ||
        /^[1-9](\.[1-9])?\s+[A-Z]/.test(line) ||
        /^(Introduction|Abstract|Methods|Results|Discussion|Conclusions|References|Acknowledgements|Study Area)/i.test(line))
    ) {
      headings.push(line);
    }
  }

  // Extract OMML equations via JSZip
  const equations: string[] = [];
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file('word/document.xml');
    if (docFile) {
      const xmlContent = await docFile.async('string');
      const ommlMatches = xmlContent.match(/<m:oMath[^>]*>[\s\S]*?<\/m:oMath>/g) ?? [];
      for (const omml of ommlMatches) {
        const latex = ommlToLatex(omml);
        if (latex) {
          equations.push(latex);
        }
      }
    }
  } catch {
    // If zip parsing fails, continue with empty equations
  }

  // Extract references block heuristically
  const refStart = rawText.search(/\bReferences\b/i);
  const referencesBlock = refStart >= 0 ? rawText.slice(refStart) : '';

  return {
    rawText,
    headings,
    equations,
    referencesBlock,
    filePath: key,
    fileType: 'docx',
  };
}

async function parsePdf(key: string): Promise<DocumentContent> {
  // Dynamic import to avoid issues with pdf-parse's test file detection
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
  const buffer = await downloadFromSpaces(key);
  const data = await pdfParse(buffer);
  const rawText = data.text;

  const lines = rawText.split('\n');
  const headings: string[] = [];
  const equations: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const nextLine = lines[i + 1]?.trim() ?? '';

    // Heuristic heading: short, title-cased, followed by blank line
    if (
      line.length > 0 &&
      line.length < 80 &&
      nextLine === '' &&
      /^[A-Z]/.test(line) &&
      !line.endsWith('.')
    ) {
      headings.push(line);
    }

    // Heuristic equation: contains = with surrounding math symbols
    if (/[=+\-*/^]/.test(line) && /[0-9a-zA-Z]/.test(line) && line.length < 120) {
      const mathSymbols = (line.match(/[=+\-*/^∑∫√α-ωΑ-Ω]/g) ?? []).length;
      if (mathSymbols >= 2) {
        equations.push(line);
      }
    }
  }

  const refStart = rawText.search(/\bReferences\b/i);
  const referencesBlock = refStart >= 0 ? rawText.slice(refStart) : '';

  return {
    rawText,
    headings,
    equations,
    referencesBlock,
    filePath: key,
    fileType: 'pdf',
  };
}

export async function parseDocument(key: string, mimeType: string): Promise<DocumentContent> {
  const normalizedMime = mimeType.toLowerCase();
  const ext = path.extname(key).toLowerCase();

  if (
    normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    return parseDocx(key);
  }

  if (normalizedMime === 'application/pdf' || ext === '.pdf') {
    return parsePdf(key);
  }

  throw new Error(`Unsupported file type for key ${key}: mime=${mimeType}, ext=${ext}`);
}
