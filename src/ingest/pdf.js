import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { joinPages, paragraphsOfPage } from './pdfText.js'

// pdf.js reads the file in a worker so a big PDF does not freeze the page.
GlobalWorkerOptions.workerSrc = workerUrl

/**
 * Reads the text of a PDF page by page. It stops once the text is longer than `maxChars`, because the caller will refuse it anyway.
 * Returns { paragraphs, pageCount, truncated }.
 */
export async function readPdf(file, { maxChars }) {
  const loading = getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, verbosity: 0 })
  try {
    const pdf = await loading.promise
    const pages = []
    let chars = 0
    for (let number = 1; number <= pdf.numPages; number++) {
      const { items } = await (await pdf.getPage(number)).getTextContent()
      const paragraphs = paragraphsOfPage(items)
      pages.push(paragraphs)
      chars += paragraphs.reduce((total, paragraph) => total + paragraph.length, 0)
      if (chars > maxChars) return { paragraphs: joinPages(pages), pageCount: pdf.numPages, truncated: true }
    }
    return { paragraphs: joinPages(pages), pageCount: pdf.numPages, truncated: false }
  } finally {
    await loading.destroy()
  }
}
