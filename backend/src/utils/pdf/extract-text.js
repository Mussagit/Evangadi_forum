/**
 * Extracts plain text from a PDF buffer using `pdf-parse`.
 *
 * Written defensively because `pdf-parse` has changed its export shape
 * across major versions (a plain async function in v1.x vs. a
 * `PDFParse` class with a `getText()` method in some v2.x releases).
 * If you're on a version where this doesn't work out of the box, adjust
 * the branch below to match your installed API.
 *
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export async function extractPdfText(buffer) {
  const mod = await import('pdf-parse');
  const candidate = mod.default ?? mod;

  if (typeof candidate === 'function') {
    const result = await candidate(buffer);
    return result?.text || '';
  }

  if (candidate && typeof candidate === 'object' && typeof candidate.PDFParse === 'function') {
    const parser = new candidate.PDFParse({ data: buffer });
    const result = await parser.getText();
    return result?.text || '';
  }

  if (typeof mod.PDFParse === 'function') {
    const parser = new mod.PDFParse({ data: buffer });
    const result = await parser.getText();
    return result?.text || '';
  }

  throw new Error('Unrecognized pdf-parse module shape; unable to extract text.');
}
