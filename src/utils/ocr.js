import { createWorker } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()

async function blobToCanvas(blob) {
  const image = await createImageBitmap(blob)
  const canvas = window.document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext('2d').drawImage(image, 0, 0)
  image.close()
  return canvas
}

async function pdfToCanvas(blob) {
  const document = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise
  const page = await document.getPage(1)
  const viewport = page.getViewport({ scale: 1.8 })
  const canvas = window.document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return canvas
}

export async function recognizeDocument(blob, name, onProgress) {
  const source = await (/\.pdf$/i.test(name) ? pdfToCanvas(blob) : blobToCanvas(blob))
  const previewUrl = source.toDataURL('image/png')
  const worker = await createWorker(['eng', 'hin'])
  const result = await worker.recognize(source)
  await worker.terminate()
  onProgress?.(100)
  return { name, text: result.data.text, previewUrl }
}

export async function recognizeAll(documents, onDocumentProgress) {
  const output = []
  for (const document of documents) {
    output.push(await recognizeDocument(document.blob, document.name, (progress) => onDocumentProgress?.(document.name, progress)))
  }
  return output
}