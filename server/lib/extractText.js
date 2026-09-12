/**
 * Extract plain text from uploaded training documents (PDF, Word, Excel, text).
 * Images are accepted as knowledge media (caption stored separately).
 * Caps length so a single file cannot blow the chatbot prompt.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

const MAX_CHARS = 80_000
const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const KNOWLEDGE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'knowledge')

const TEXT_EXT = new Set(['.txt', '.md', '.csv'])
const EXCEL_EXT = new Set(['.xlsx', '.xls'])
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

export function isImageTrainingFile(filename = '', mimetype = '') {
  const ext = extname(filename)
  if (IMAGE_EXT.has(ext)) return true
  return String(mimetype || '').startsWith('image/')
}

export function isSupportedTrainingFile(filename = '', mimetype = '') {
  if (isImageTrainingFile(filename, mimetype)) return true
  const ext = extname(filename)
  if (TEXT_EXT.has(ext) || ext === '.pdf' || ext === '.docx' || EXCEL_EXT.has(ext)) return true
  if (mimetype === 'application/pdf' || mimetype.startsWith('text/')) return true
  if (mimetype.includes('spreadsheet') || mimetype.includes('wordprocessingml')) return true
  return false
}

export async function extractDocumentText(buffer, filename = '', mimetype = '') {
  if (isImageTrainingFile(filename, mimetype)) {
    throw new Error('IMAGE_FILE')
  }
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
    throw new Error('Unsupported file type. Use PDF, DOCX, XLSX, TXT, or an image (JPG/PNG/WEBP).')
  }

  return clip(text)
}

/** Persist an image buffer under uploads/knowledge/{businessId}/ and return relative path. */
export async function saveKnowledgeImage(businessId, file) {
  const dir = path.join(KNOWLEDGE_UPLOAD_DIR, String(businessId))
  fs.mkdirSync(dir, { recursive: true })
  const safe = String(file.originalname || 'image.jpg').replace(/[^\w.\-]+/g, '_').slice(0, 80)
  const filename = `${Date.now()}_${safe}`
  const abs = path.join(dir, filename)
  fs.writeFileSync(abs, file.buffer)
  const rel = path.join(String(businessId), filename).replace(/\\/g, '/')
  return {
    rel,
    abs,
    urlPath: `/uploads/knowledge/${rel}`,
    mimetype: file.mimetype || 'image/jpeg',
    originalname: file.originalname || filename,
  }
}

export function resolveKnowledgeMediaPath(relOrUrl) {
  if (!relOrUrl) return null
  let rel = String(relOrUrl)
  if (rel.startsWith('/uploads/knowledge/')) rel = rel.slice('/uploads/knowledge/'.length)
  if (rel.startsWith('uploads/knowledge/')) rel = rel.slice('uploads/knowledge/'.length)
  const abs = path.join(KNOWLEDGE_UPLOAD_DIR, rel)
  if (!abs.startsWith(KNOWLEDGE_UPLOAD_DIR)) return null
  if (!fs.existsSync(abs)) return null
  return abs
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
