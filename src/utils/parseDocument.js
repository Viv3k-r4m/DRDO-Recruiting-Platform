import { eligibilityRules } from '../data/eligibilityRules'

const clean = (value = '') => value.replace(/\s+/g, ' ').trim()
const first = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return clean(match[1])
  }
  return ''
}
const valueAfterLabel = (text, labels, valuePattern = '([^\\n]+)') => first(text, labels.map((label) => new RegExp(`${label}\\s*[:\\-]?\\s*${valuePattern}`, 'i')))
const validPersonName = (value) => value && !/(school|candidate|student|mother|father|name|full|form)/i.test(value) ? value : ''
const fallbackPersonName = (text) => {
  const values = text.match(/\b[A-Z]{3,}(?:\s+[A-Z]{3,}){1,2}\b/g) || []
  return values.find((value) => !/(SCHOOL|CANDIDATE|STUDENT|MOTHER|FATHER|CENTRAL|BOARD|COMPUTER|SCIENCE|ENGINEERING|UNIVERSITY|COLLEGE|ONLINE|APPLICATION|FORM|GATE|SCORE)/i.test(value)) || ''
}

export function parseEligibilityRules(text = '') {
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => match[1])
  const cgpa = text.match(/(?:minimum|min|required)[^\n]{0,40}(?:cgpa|aggregate)[^\d]{0,10}(\d(?:\.\d+)?)/i)?.[1]
  const ageRange = text.match(/(?:age|years)[^\d]{0,20}(\d{2})\s*(?:to|-|–)\s*(\d{2})/i)
  const categories = [...text.matchAll(/\b(general|obc|sc|st|ews)\b/gi)].map((match) => match[1])
  const branch = text.match(/(computer science(?: and engineering| & engineering)?|information technology|\bcse\b)/i)?.[1]
  const advertisement = text.match(/(?:advertisement|advt\.?|advertisement no\.?)\s*[:\-]?\s*(\d{2,5})/i)?.[1]
  const uniqueYears = [...new Set(years)].sort()

  return {
    advertisement: advertisement || '',
    acceptedCategories: [...new Set(categories.map((category) => category.toUpperCase() === 'GENERAL' ? 'General' : category.toUpperCase()))],
    acceptedGateYears: uniqueYears,
    minimumCgpa: cgpa ? Number(cgpa) : null,
    minimumAge: ageRange ? Number(ageRange[1]) : null,
    maximumAge: ageRange ? Number(ageRange[2]) : null,
    requiredBranch: branch ? branch.toLowerCase().replace(/\s*&\s*/g, ' and ') : ''
  }
}

function usableRules(criteriaText) {
  const parsed = parseEligibilityRules(criteriaText)
  return {
    ...eligibilityRules,
    ...parsed,
    acceptedCategories: parsed.acceptedCategories.length ? parsed.acceptedCategories : eligibilityRules.acceptedCategories,
    acceptedGateYears: parsed.acceptedGateYears.length ? parsed.acceptedGateYears : eligibilityRules.acceptedGateYears,
    minimumCgpa: parsed.minimumCgpa ?? eligibilityRules.minimumCgpa,
    minimumAge: parsed.minimumAge ?? eligibilityRules.minimumAge,
    maximumAge: parsed.maximumAge ?? eligibilityRules.maximumAge,
    requiredBranch: parsed.requiredBranch || eligibilityRules.requiredBranch
  }
}

function parseFields(text) {
  const name = validPersonName(valueAfterLabel(text, ["name of (?:the )?candidate", "student['’]?s name", 'candidate name', 'applicant name'], '([A-Z][A-Z .]{2,})')) || fallbackPersonName(text)
  const fatherName = validPersonName(valueAfterLabel(text, ["father['’]?s name", 'father name'], '([A-Z][A-Z .]{2,})'))
  const dob = valueAfterLabel(text, ['date of birth', 'dob', 'जन्म तिथि'], '(\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{4})') || first(text, [/(\b\d{1,2}[\/-]\d{1,2}[\/-]20\d{2}\b)/])
  const category = /सामान्य|\bgeneral\b/i.test(text) ? 'General' : valueAfterLabel(text, ['category', 'caste'], '(general|obc|sc|st)')
  const cgpa = first(text, [/(?:cgpa|c\.g\.p\.a)\s*(?:\(on 10-point scale\))?\s*[:\-]?\s*(\d(?:\.\d{1,2})?)/i])
  const branch = /computer\s+science|\bcse\b/i.test(text) ? 'Computer Science & Engineering' : valueAfterLabel(text, ['branch', 'discipline'], '([^\\n]+)')
  const class12 = first(text, [/(?:percentage|marks percentage)\s*[:\-]?\s*(\d{2}(?:\.\d{1,2})?\s*%)/i, /percentage\s*[:\-]?\s*(\d{2}(?:\.\d{1,2})?\s*%)/i, /(first class with distinction)/i])
  const gateYear = first(text, [/(?:gate|exam|examination)\s*(20\d{2})/i, /(?:year of examination|exam year|year)\s*[:\-]?\s*(20\d{2})/i])
  const gateScore = valueAfterLabel(text, ['gate score', 'score'], '(\d{3,4})') || first(text, [/gate\s+score[^\d]{0,12}(\d{3,4})/i])
  const gatePaper = /computer science and information technology|\bCS\b|computer science/i.test(text) ? 'CS' : 'Not detected'
  const validTill = first(text, [/(?:valid up to|valid till|validity)\s*[:\-]?\s*([^\n]+)/i])
  const air = valueAfterLabel(text, ['all india rank', 'air'], '(\d+)') || first(text, [/(?:all india rank|air)[^\d]{0,12}(\d{1,6})/i])

  return {
    name: name || 'Not detected',
    fatherName: fatherName || 'Not detected',
    dob: dob || 'Not detected',
    category: category || 'Not detected',
    class12: class12 || 'Not detected',
    btech: cgpa ? `${cgpa} CGPA${branch ? ` - ${branch}` : ''}` : (branch || 'Not detected'),
    branch: branch || '',
    cgpa: Number(cgpa) || 0,
    gate: { year: gateYear || 'Not detected', score: gateScore || 'Not detected', paper: gatePaper, air: air || 'Not detected', validTill: validTill || 'Not detected' }
  }
}

export function parseDocuments(ocrDocuments) {
  const byName = (part) => ocrDocuments.find((document) => document.name.toLowerCase().includes(part))?.text || ''
  const caste = parseFields(byName('caste_certificate'))
  const class12 = parseFields(byName('class12_marksheet'))
  const college = parseFields(byName('college_marksheet'))
  const gate = parseFields(byName('gate_scorecard'))
  const applicationText = byName('application_form')
  const criteriaText = byName('eligibility_criteria')
  const application = applicationText ? parseFields(applicationText) : null
  const extracted = {
    ...caste,
    name: caste.name !== 'Not detected' ? caste.name : (college.name !== 'Not detected' ? college.name : class12.name),
    fatherName: caste.fatherName !== 'Not detected' ? caste.fatherName : college.fatherName,
    dob: caste.dob !== 'Not detected' ? caste.dob : gate.dob,
    class12: class12.class12,
    btech: college.btech,
    branch: college.branch,
    cgpa: college.cgpa,
    gate: gate.gate,
    casteHindiText: /सामान्य/.test(byName('caste_certificate')) ? 'सामान्य / General' : 'Not detected',
    criteriaText,
    eligibilityRules: usableRules(criteriaText),
    applicationText,
    rawText: ocrDocuments.map((document) => `${document.name}\n${document.text}`).join('\n')
  }
  return application ? { ...extracted, application } : extracted
}

export function evaluateEligibility(extracted, application, rules = extracted.eligibilityRules || eligibilityRules) {
  const age = extracted.dob !== 'Not detected' ? new Date().getFullYear() - Number(extracted.dob.slice(-4)) : 0
  const normalizedExtracted = JSON.stringify(extracted).toLowerCase()
  const normalizedApplication = JSON.stringify(application || {}).toLowerCase()
  const matches = application && (normalizedExtracted.includes(normalizedApplication) || extracted.name === application.name)
  const checks = [
    { label: 'Required B.Tech branch', ok: Boolean(rules.requiredBranch) && extracted.branch.toLowerCase().includes(rules.requiredBranch) },
    { label: 'Minimum B.Tech CGPA / class', ok: extracted.cgpa >= rules.minimumCgpa || /first class/i.test(extracted.btech) },
    { label: 'Valid GATE score and year', ok: rules.acceptedGateYears.includes(extracted.gate.year) && extracted.gate.paper === 'CS' },
    { label: 'Recognized category on caste certificate', ok: rules.acceptedCategories.includes(extracted.category) },
    { label: 'Age within criteria range', ok: age >= rules.minimumAge && age <= rules.maximumAge },
    { label: 'All key fields match Application Form', ok: matches }
  ]
  const score = Math.round((checks.filter((check) => check.ok).length / checks.length) * 100)
  return { checks, score, eligible: checks.every((check) => check.ok) }
}
