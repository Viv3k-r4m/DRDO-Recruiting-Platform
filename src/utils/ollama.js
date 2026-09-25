import { evaluateEligibility, parseDocuments } from './parseDocument'
import { eligibilityRules as backupRules } from '../data/eligibilityRules'

const OLLAMA_URL = '/ollama/api/chat'
const MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'qwen2.5:3b'

const schema = {
  extracted: {
    name: 'Not detected',
    fatherName: 'Not detected',
    dob: 'Not detected',
    category: 'Not detected',
    class12: 'Not detected',
    btech: 'Not detected',
    branch: '',
    cgpa: 0,
    casteHindiText: 'Not detected',
    gate: { year: 'Not detected', score: 'Not detected', paper: 'Not detected', air: 'Not detected', validTill: 'Not detected' },
    application: null,
    eligibilityRules: null,
    criteriaText: ''
  },
  checks: []
}

const clean = (value, fallback = 'Not detected') => typeof value === 'string' && value.trim() ? value.trim() : fallback

function normalizeExtracted(value = {}) {
  const gate = value.gate || {}
  const modelRules = value.eligibilityRules || {}
  const rules = {
    ...backupRules,
    ...modelRules,
    acceptedCategories: Array.isArray(modelRules.acceptedCategories) && modelRules.acceptedCategories.length ? modelRules.acceptedCategories : backupRules.acceptedCategories,
    acceptedGateYears: Array.isArray(modelRules.acceptedGateYears) && modelRules.acceptedGateYears.length ? modelRules.acceptedGateYears : backupRules.acceptedGateYears
  }
  return {
    ...schema.extracted,
    ...value,
    name: clean(value.name),
    fatherName: clean(value.fatherName),
    dob: clean(value.dob),
    category: clean(value.category),
    class12: clean(value.class12),
    btech: clean(value.btech),
    branch: clean(value.branch, ''),
    cgpa: Number(value.cgpa) || 0,
    casteHindiText: clean(value.casteHindiText),
    gate: {
      ...schema.extracted.gate,
      ...gate,
      year: clean(gate.year),
      score: clean(gate.score),
      paper: clean(gate.paper),
      air: clean(gate.air),
      validTill: clean(gate.validTill)
    },
    eligibilityRules: rules
  }
}

function promptFor(ocrDocuments) {
  const documents = ocrDocuments.map(({ name, text }) => `DOCUMENT: ${name}\n${text.slice(0, 12000)}`).join('\n\n')
  return `You are a multilingual document-verification agent for RAC DRDO.
Extract only facts explicitly present in the OCR. Translate Hindi and any other non-English text to English before comparing fields or applying rules, but preserve the original meaning. Do not guess, repair, or copy values between documents unless the document states them. Use "Not detected" for missing strings and 0 for missing cgpa.

The document named eligibility_criteria is authoritative. Extract its advertisement number, accepted categories, accepted GATE years, CGPA/class rule, age range, and required branch into extracted.eligibilityRules. Use those extracted rules for every check. Do not use outside knowledge or application data as a substitute for missing criteria.

Return one JSON object only with this exact shape:
${JSON.stringify(schema)}

For checks, return exactly these labels and set ok only when the OCR evidence supports the rule:
1. Required B.Tech branch
2. Minimum B.Tech CGPA / class
3. Valid GATE score and year
4. Recognized category on caste certificate
5. Age within criteria range
6. All key fields match Application Form
Each check must also include a short evidence string. Preserve the application form values in extracted.application when it is present.

OCR input:
${documents}`
}

async function callOllama(ocrDocuments) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: 'json',
      options: { temperature: 0, num_predict: 1400 },
      messages: [{ role: 'user', content: promptFor(ocrDocuments) }]
    })
  })
  if (!response.ok) throw new Error(`Ollama request failed (${response.status}). Is Ollama running?`)
  const payload = await response.json()
  return JSON.parse(payload.message?.content || '{}')
}

function guardVerification(extracted, modelChecks, application) {
  const deterministic = evaluateEligibility(extracted, application, extracted.eligibilityRules)
  const checks = deterministic.checks.map((check, index) => ({
    ...check,
    evidence: modelChecks?.[index]?.evidence || (check.ok ? 'Verified from extracted document data.' : 'Required evidence was not found.')
  }))
  return {
    checks,
    score: Math.round((checks.filter((check) => check.ok).length / checks.length) * 100),
    eligible: checks.every((check) => check.ok)
  }
}

export async function verifyWithOllama(ocrDocuments, applicationFallback) {
  try {
    const result = await callOllama(ocrDocuments)
    const extracted = normalizeExtracted(result.extracted)
    const application = extracted.application || applicationFallback
    return { extracted, verification: guardVerification(extracted, result.checks, application), source: `Ollama (${MODEL})` }
  } catch (error) {
    const extracted = parseDocuments(ocrDocuments)
    const application = extracted.application || applicationFallback
    return {
      extracted,
      verification: evaluateEligibility(extracted, application, extracted.eligibilityRules),
      source: 'Deterministic fallback',
      warning: error.message
    }
  }
}