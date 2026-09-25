import React from 'react'
import { Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

export default function EligibilityChecklist({verification, show}){
  const { checks = [], score = 0, eligible = false } = verification || {}

  return (
    <div>
      <h4 className="font-semibold mb-3">Eligibility Check</h4>
      {!show && <div className="text-sm text-gray-500">Run extraction to evaluate eligibility.</div>}
      {show && (
        <div>
          <div className="space-y-2 mb-4">
            {checks.map((c, idx)=> (
              <div className="flex items-center justify-between" key={idx}>
                <div className="text-sm">{c.label}</div>
                <div>{c.ok ? <Check className="text-green-600"/> : <X className="text-red-600"/>}</div>
              </div>
            ))}
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium">Eligibility Score</div>
              <div className="text-sm font-semibold">{score}%</div>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <motion.div initial={{width:0}} animate={{width:`${score}%`}} className="h-3 bg-green-500 rounded-full" transition={{duration:1}} />
            </div>
          </div>

          <div className="text-center py-4">
            {eligible ? (
              <div className="inline-block bg-green-100 text-green-800 px-6 py-3 rounded-full font-semibold">ELIGIBLE</div>
            ) : (
              <div className="inline-block bg-red-100 text-red-800 px-6 py-3 rounded-full font-semibold">NOT ELIGIBLE</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
