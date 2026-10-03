export function extractFatherName(text = '') {
  const match = text.match(/(?:father['’]?s\s+name|name\s+of\s+father|father\s+name)[^\r\n:]{0,80}:\s*([^/\r\n]+)/i)
  return match?.[1]?.trim() || ''
}

export function extractCategory(text = '') {
  const categoryPattern = '\\b(general|obc(?:-ncl)?|ur|sc|st|ews)\\b'
  const match = text.match(new RegExp(`\\b(?:belongs\\s+to(?:\\s+the)?|community|category)\\b[\\s\\S]{0,30}?${categoryPattern}`, 'i'))
    || text.match(new RegExp(categoryPattern, 'i'))

  if (!match) return 'GENERAL'

  const category = match[1].toUpperCase()
  if (category === 'GENERAL' || category === 'UR') return 'UR'
  if (category === 'OBC') return 'OBC-NCL'
  return category
}

export function extractBtech(text = '') {
  const cgpaMatch = text.match(/\b(?:cgpa|c\.g\.p\.a)\b\s*(?:\(\s*on\s*10[- ]point\s*scale\s*\))?\s*[:\-]?\s*(\d{1,2}(?:[.,]\d{1,2})?)(?![\d.])/i)
  if (cgpaMatch) return `${cgpaMatch[1].replace(',', '.')} CGPA`

  const btechMatch = text.match(/(?:b\.?tech|b\.?e\.?|degree|bachelor)[\s\S]{0,100}?(?:%|marks)[\s\S]{0,30}?([4-9]\d(?:\.\d+)?)/is)
  if (!btechMatch) return '0 CGPA'

  const value = Number.parseFloat(btechMatch[1])
  return value > 10 ? `${value}%` : `${value} CGPA`
}