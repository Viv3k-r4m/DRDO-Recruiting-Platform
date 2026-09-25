const supportedDocuments = /\.(png|jpe?g|pdf)$/i
const requiredDocuments = ['caste_certificate', 'class12_marksheet', 'college_marksheet', 'gate_scorecard', 'application_form', 'eligibility_criteria']

function baseName(file) {
  return file.name.replace(/\.[^.]+$/, '').toLowerCase()
}

export function collectDocuments(fileList) {
  const files = Array.from(fileList || [])
    .filter((file) => supportedDocuments.test(file.name))
    .map((file) => ({ name: file.name, blob: file }))

  const names = new Set(files.map(({ name }) => baseName({ name })))
  const missing = requiredDocuments.filter((required) => !names.has(required))
  if (missing.length) throw new Error(`Documents folder is missing: ${missing.join(', ')}`)
  return files
}