import React from 'react'
import { Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

function Row({field, left, right}){
  const match = String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase()
  return (
    <motion.div className="grid grid-cols-12 gap-2 items-center py-2 border-b" initial={{opacity:0}} animate={{opacity:1}}>
      <div className="col-span-4 font-medium text-sm">{field}</div>
      <div className="col-span-4 text-sm text-gray-700">{left}</div>
      <div className="col-span-3 text-sm text-gray-700">{right}</div>
      <div className="col-span-1 text-right">
        {match ? <Check className="text-green-600 inline-block" /> : <X className="text-red-600 inline-block" />}
      </div>
    </motion.div>
  )
}

export default function ComparisonTable({extracted, application, show}){
  if(!show){
    return <div className="text-sm text-gray-500">Run extraction to view comparison results.</div>
  }
  return (
    <div>
      <div className="grid grid-cols-12 gap-2 font-semibold text-sm border-b pb-2 mb-2">
        <div className="col-span-4">Field</div>
        <div className="col-span-4">From Documents</div>
        <div className="col-span-3">From Application</div>
        <div className="col-span-1 text-right">Match?</div>
      </div>

      <Row field="Name" left={extracted.name} right={application.name} />
      <Row field="Father Name" left={extracted.fatherName} right={application.fatherName} />
      <Row field="DOB" left={extracted.dob} right={application.dob} />
      <Row field="Category" left={extracted.category} right={application.category} />
      <Row field="Class 12" left={extracted.class12} right={application.class12} />
      <Row field="B.Tech / Branch" left={extracted.btech} right={application.btech} />
      <Row field="GATE Score" left={`${extracted.gate.score} (AIR ${extracted.gate.air})`} right={`${application.gate.score} (AIR ${application.gate.air})`} />
      <Row field="GATE Paper / Year" left={`${extracted.gate.paper} / ${extracted.gate.year}`} right={`${application.gate.paper || 'CS'} / ${application.gate.year}`} />
    </div>
  )
}
