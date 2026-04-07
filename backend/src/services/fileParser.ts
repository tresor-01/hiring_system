import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

// Dynamic import for pdf-parse to handle module issues
async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parse error:', error);
    return '';
  }
}

export async function parseFile(filePath: string, mimeType: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return await parsePDF(buffer);
  } else if (
    ext === '.docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (ext === '.doc' || mimeType === 'application/msword') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (ext === '.txt' || mimeType === 'text/plain') {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export function extractCandidateInfo(text: string): {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
} {
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?[\d\s\-.(]{10,})/);
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);

  // Basic name extraction: take the first non-empty line
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const nameLine = lines[0]?.replace(/[^a-zA-Z\s]/g, '').trim();

  return {
    name: nameLine && nameLine.length > 2 && nameLine.length < 50 ? nameLine : undefined,
    email: emailMatch ? emailMatch[0] : undefined,
    phone: phoneMatch ? phoneMatch[0].trim() : undefined,
    location: undefined, // Would need more sophisticated parsing
    linkedinUrl: linkedinMatch ? `https://www.${linkedinMatch[0]}` : undefined
  };
}
