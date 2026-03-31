// apps/api/src/services/documentParser.ts
import fs from 'fs';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { DocumentContent } from '../types';

// Basic OMML to LaTeX mapping for common constructs
function ommlToLatex(omml: string): string {
  return omml
    .replace(/<m:r[^>]*>.*?<m:t[^>]*>(.*?)<\/m:t>.*?<\/m:r>/gs, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function parseDocx(filePath: string): Promise<DocumentContent> {
  const buffer = fs.readFileSync(filePath);

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
    filePath,
    fileType: 'docx',
  };
}

async function parsePdf(filePath: string): Promise<DocumentContent> {
  // Dynamic import to avoid issues with pdf-parse's test file detection
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
  const buffer = fs.readFileSync(filePath);
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
    filePath,
    fileType: 'pdf',
  };
}

export async function parseDocument(filePath: string): Promise<DocumentContent> {
  const ext = filePath.toLowerCase().split('.').pop();
  if (ext === 'docx') {
    return parseDocx(filePath);
  } else if (ext === 'pdf') {
    return parsePdf(filePath);
  }
  throw new Error(`Unsupported file type: ${ext}`);
}
