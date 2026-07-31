export type UploadedPromptFile = {
  id: string
  name: string
  size: number
  text: string
}

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const supportedExtensions = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'pdf', 'docx', 'pptx', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'webp', 'bmp'])

function extensionOf(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function normalizeExtractedText(value: string) {
  return value
    .normalize('NFKC')
    .split('').filter((character) => {
      const code = character.charCodeAt(0)
      return !(code < 32 && code !== 9 && code !== 10) && code !== 127
    }).join('')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function readPdfFile(file: File) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = normalizeExtractedText(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
    if (text) pages.push(`[PAGE ${pageNumber}]\n${text}`)
  }
  return normalizeExtractedText(pages.join('\n\n'))
}

async function readDocx(file: File) {
  const mammoth = await import('mammoth/mammoth.browser')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

async function readPptx(file: File) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slideNames = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))
  const slides: string[] = []
  for (const [index, name] of slideNames.entries()) {
    const xml = await zip.files[name].async('text')
    const text = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => match[1]).join(' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
    if (text) slides.push(`[SLIDE ${index + 1}]\n${text}`)
  }
  return slides.join('\n\n')
}

async function readSpreadsheet(file: File) {
  const xlsx = await import('xlsx')
  const workbook = xlsx.read(await file.arrayBuffer(), { type: 'array' })
  return workbook.SheetNames.map((name) => `[SHEET ${name}]\n${xlsx.utils.sheet_to_csv(workbook.Sheets[name])}`).join('\n\n')
}

async function readImage(file: File) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const result = await worker.recognize(file)
    return result.data.text
  } finally {
    await worker.terminate()
  }
}

export async function parsePromptFile(file: File): Promise<UploadedPromptFile> {
  const extension = extensionOf(file.name)
  if (!supportedExtensions.has(extension)) throw new Error(`${file.name}: 지원하지 않는 형식입니다.`)
  const rawText = extension === 'pdf' ? await readPdfFile(file)
    : extension === 'docx' ? await readDocx(file)
      : extension === 'pptx' ? await readPptx(file)
        : extension === 'xlsx' || extension === 'xls' ? await readSpreadsheet(file)
          : ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(extension) ? await readImage(file)
            : await file.text()
  const text = extension === 'json' ? (() => { try { return JSON.stringify(JSON.parse(rawText), null, 2) } catch { return normalizeExtractedText(rawText) } })() : normalizeExtractedText(rawText.replace(/^\uFEFF/, ''))
  if (!text) throw new Error(`${file.name}: 추출할 텍스트가 없습니다. 스캔 PDF는 OCR 처리가 필요합니다.`)
  return { id: `${file.name}-${file.lastModified}-${file.size}`, name: file.name, size: file.size, text }
}

export function buildFilePromptContext(files: UploadedPromptFile[]) {
  if (!files.length) return ''
  return ['[UPLOADED REFERENCE FILES]', ...files.map((file) => `--- ${file.name} ---\n${file.text}`), '[/UPLOADED REFERENCE FILES]'].join('\n\n')
}
