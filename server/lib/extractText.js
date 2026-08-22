/**
 * Extract plain text from uploaded training documents (PDF, Word, Excel, text).
 * Caps length so a single file cannot blow the chatbot prompt.
 */
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

const MAX_CHARS = 80_000

const TEXT_EXT = new Set(['.txt', '.md', '.csv'])
const EXCEL_EXT = new Set(['.xlsx', '.xls'])

export function isSupportedTrainingFile(filename = '', mimetype = '') {
  const ext = extname(filename)
  if (TEXT_EXT.has(ext) || ext === '.pdf' || ext === '.docx' || EXCEL_EXT.has(ext)) return true
  if (mimetype === 'application/pdf' || mimetype.startsWith('text/')) return true
  if (mimetype.includes('spreadsheet') || mimetype.includes('wordprocessingml')) return true
  return false
}

export async function extractDocumentText(buffer, filename = '', mimetype = '') {
  const ext = extname(filename)
  let text = ''

  if (TEXT_EXT.has(ext) || mimetype.startsWith('text/') || mimetype === 'application/csv') {
    text = buffer.toString('utf8')
  } else if (ext === '.pdf' || mimetype === 'application/pdf') {
    text = await extractPdf(buffer)
  } else if (ext === '.docx' || mimetype.includes('wordprocessingml')) {
    const { value } = await mammoth.extractRawText({ buffer })
    text = value
  } else if (EXCEL_EXT.has(ext) || mimetype.includes('spreadsheet')) {
    text = extractSpreadsheet(buffer)
  } else if (ext === '.doc') {
    throw new Error('Old .doc files are not supported. Save as PDF, DOCX, or TXT and try again.')
  } else {
    throw new Error('Unsupported file type. Use PDF, DOCX, XLSX, or TXT.')
  }

  return clip(text)
}

function extname(name) {
  const i = String(name || '').lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function clip(raw) {
  const text = String(raw || '').replace(/\0/g, '').replace(/\r\n/g, '\n').trim()
  if (!text) throw new Error('No text could be extracted from this file.')
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
}

function extractSpreadsheet(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  return wb.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name] || {})
    return `## ${name}\n${csv}`
  }).join('\n\n')
}

async function extractPdf(buffer) {
  const mod = await import('pdf-parse')
  if (typeof mod.PDFParse === 'function') {
    const parser = new mod.PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return result?.text || ''
    } finally {
      if (typeof parser.destroy === 'function') await parser.destroy()
    }
  }
  const pdf = mod.default || mod
  if (typeof pdf === 'function') {
    const data = await pdf(buffer)
    return data?.text || ''
  }
  throw new Error('Could not read this PDF.')
}
