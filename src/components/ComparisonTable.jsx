import React from 'react'
import { Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

function Row({field, left, right, delay}){
  const match = String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase()
  return (
    <motion.tr 
      className={`border-b border-gray-300 hover:bg-gray-50 ${match ? '' : 'bg-red-50'}`} 
      initial={{opacity:0, x: -10}} 
      animate={{opacity:1, x: 0}}
      transition={{ delay: delay * 0.1 }}
    >
      <td className="p-3 text-sm font-bold border-r border-gray-300 bg-gray-100">{field}</td>
      <td className="p-3 text-sm text-gray-800 border-r border-gray-300">{left || '-'}</td>
      <td className="p-3 text-sm text-gray-800 border-r border-gray-300">{right || '-'}</td>
      <td className="p-3 text-center">
        {match ? <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold border border-green-300"><Check size={14}/> MATCH</div> : <div className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold border border-red-300"><X size={14}/> MISMATCH</div>}
      </td>
    </motion.tr>
  )
}

export default function ComparisonTable({extracted, application, show}){
  if(!show){
    return <div className="text-sm text-gray-500">Run extraction to view comparison results.</div>
  }
  return (
    <div className="overflow-x-auto rounded border border-drdoblue">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-drdoblue text-white text-sm">
            <th className="p-3 font-bold border-r border-blue-800">Verification Field</th>
            <th className="p-3 font-bold border-r border-blue-800">Extracted from Documents</th>
            <th className="p-3 font-bold border-r border-blue-800">Application Form Database</th>
            <th className="p-3 font-bold text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          <Row delay={1} field="Candidate Name" left={extracted.name} right={application.name} />
          <Row delay={2} field="Father's Name" left={extracted.fatherName} right={application.fatherName} />
          <Row delay={3} field="Date of Birth" left={extracted.dob} right={application.dob} />
          <Row delay={4} field="Category" left={extracted.category} right={application.category} />
          <Row delay={5} field="Class 12th" left={extracted.class12} right={application.class12} />
          <Row delay={6} field="B.Tech Degree" left={extracted.btech} right={application.btech} />
          <Row delay={7} field="GATE Score & AIR" left={`${extracted.gate.score} (AIR ${extracted.gate.air})`} right={`${application.gate.score} (AIR ${application.gate.air})`} />
          <Row delay={8} field="GATE Paper / Year" left={`${extracted.gate.paper} / ${extracted.gate.year}`} right={`${application.gate.paper || 'CS'} / ${application.gate.year}`} />
        </tbody>
      </table>
    </div>
  )
}
