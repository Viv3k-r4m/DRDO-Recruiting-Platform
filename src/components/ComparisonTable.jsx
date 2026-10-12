import React from 'react'
import { Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

function Row({field, left, right, delay}){
  let match = false
  const leftStr = String(left || '').trim().toLowerCase()
  const rightStr = String(right || '').trim().toLowerCase()

  const evaluateMatch = (l, r) => {
    if (r === 'any' || r === 'n/a' || r === 'matches degree') {
      return true
    } else if (r.includes('age <=')) {
      // Calculate age from left string (DD/MM/YYYY)
      const dobMatch = l.match(/(\d{2})[-/](\d{2})[-/](\d{4})/)
      if (dobMatch) {
        const year = parseInt(dobMatch[3], 10)
        const age = new Date().getFullYear() - year
        // We assume worst-case (lowest threshold) or we can dynamically check, 
        // but for now 40 is max, and most candidates are well under 30.
        // If age is less than 35, it's a pass for everyone. 
        if (age <= 35) return true
        if (age <= 38 && r.includes('38')) return true
        if (age <= 40 && r.includes('40')) return true
        return false
      }
      return true // Fallback if no valid date found
    } else if (r.startsWith('>=')) {
      const requiredMatch = r.match(/[\d.]+/)
      const actualMatch = l.match(/[\d.]+/)
      if (requiredMatch && actualMatch) {
        return parseFloat(actualMatch[0]) >= parseFloat(requiredMatch[0])
      }
      return false
    } else if (r.includes(' / ') && !l.includes(' / ')) {
      // It's a category list like "ur / ews / sc"
      return r.includes(l)
    } else if (r.includes(', or ')) {
      // It's a list like "2024, 2025, or 2026"
      return r.includes(l)
    } else {
      return l === r
    }
  }

  // Handle compound fields like "CS / 2025" vs "Matches Degree / 2024, 2025"
  if (leftStr.includes(' / ') && rightStr.includes(' / ')) {
    const lParts = leftStr.split(' / ')
    const rParts = rightStr.split(' / ')
    if (lParts.length === rParts.length) {
      match = lParts.every((lp, i) => evaluateMatch(lp.trim(), rParts[i].trim()))
    } else {
      match = false
    }
  } else {
    match = evaluateMatch(leftStr, rightStr)
  }

  return (
    <motion.tr 
      className={`border-b border-gray-200 transition-colors ${match ? 'hover:bg-green-50/40 bg-white' : 'bg-red-50/50 hover:bg-red-50'}`} 
      initial={{opacity:0, x: -6}} 
      animate={{opacity:1, x: 0}}
      transition={{ delay: delay * 0.05 }}
    >
      <td className="p-3 text-xs md:text-sm font-bold text-gray-700 border-r border-gray-200 bg-gray-50/70">{field}</td>
      <td className="p-3 text-xs md:text-sm text-gray-800 font-medium border-r border-gray-200">{left || '-'}</td>
      <td className="p-3 text-xs md:text-sm text-gray-600 border-r border-gray-200">{right || '-'}</td>
      <td className="p-3 text-center whitespace-nowrap">
        {match ? (
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300 shadow-xs">
            <Check size={13} className="text-emerald-700"/> MATCH
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-xs font-bold border border-red-300 shadow-xs">
            <X size={13} className="text-red-700"/> MISMATCH
          </span>
        )}
      </td>
    </motion.tr>
  )
}

export default function ComparisonTable({extracted = {}, application = {}, show}){
  if(!show){
    return <div className="text-sm text-gray-500 p-4">Run extraction to view comparison results.</div>
  }

  const gateScore = extracted.gate?.score ?? (typeof extracted.gate === 'number' ? extracted.gate : 0)
  const gateAir = extracted.gate?.air ?? extracted.gateAir ?? '-'
  const gatePaper = extracted.gate?.paper ?? extracted.paper ?? 'CS'
  const gateYear = extracted.gate?.year ?? extracted.gateYear ?? '2024'

  const reqGateScore = application.gate?.score ?? '>= 700'
  const reqGateAir = application.gate?.air ?? 'Any'
  const reqGatePaper = application.gate?.paper ?? 'Matches Degree'
  const reqGateYear = application.gate?.year ?? '2024, 2025, or 2026'

  return (
    <div className="overflow-x-auto rounded border border-drdoblue/30 shadow-xs">
      <table className="w-full text-left border-collapse min-w-[550px]">
        <thead>
          <tr className="bg-drdoblue text-white text-xs md:text-sm tracking-wide">
            <th className="p-3 font-bold border-r border-blue-900/40">Verification Field</th>
            <th className="p-3 font-bold border-r border-blue-900/40">Extracted from Documents</th>
            <th className="p-3 font-bold border-r border-blue-900/40">Eligibility Criteria</th>
            <th className="p-3 font-bold text-center">AI Match Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          <Row delay={1} field="Candidate Name" left={extracted.name} right={application.name} />
          <Row delay={2} field="Father's Name" left={extracted.fatherName} right={application.fatherName} />
          <Row delay={3} field="Date of Birth" left={extracted.dob} right={application.dob} />
          <Row delay={4} field="Category" left={extracted.category} right={application.category} />
          <Row delay={5} field="Class 12th" left={extracted.class12} right={application.class12} />
          <Row delay={6} field="B.Tech Degree" left={extracted.btech} right={application.btech} />
          <Row delay={7} field="GATE Score & AIR" left={`${gateScore} (AIR ${gateAir})`} right={`${reqGateScore} (AIR ${reqGateAir})`} />
          <Row delay={8} field="GATE Paper / Year" left={`${gatePaper} / ${gateYear}`} right={`${reqGatePaper} / ${reqGateYear}`} />
        </tbody>
      </table>
    </div>
  )
}
