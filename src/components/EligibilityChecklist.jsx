import React from 'react'
import { CheckSquare, XSquare, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function EligibilityChecklist({verification, show}){
  const { checks = [], score = 0, eligible = false } = verification || {}

  return (
    <div>
      <div className="bg-drdoblue text-white px-4 py-2 font-bold mb-4 rounded-t border-b-4 border-saffron flex items-center gap-2">
        <CheckSquare size={18} />
        Eligibility Assessment
      </div>
      
      {!show && <div className="text-sm text-gray-500 p-4 text-center border border-dashed border-gray-300">Run extraction to evaluate eligibility criteria.</div>}
      
      {show && (
        <div className="border border-gray-300 rounded shadow-sm">
          <table className="w-full text-left text-sm">
            <tbody>
              {checks.map((c, idx)=> (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3 font-semibold text-gray-700">{c.label}</td>
                  <td className="p-3 text-right">
                    {c.ok ? 
                      <span className="inline-flex items-center gap-1 text-green-700 font-bold bg-green-50 px-2 py-1 rounded border border-green-200"><CheckSquare size={16}/> PASS</span> : 
                      <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-50 px-2 py-1 rounded border border-red-200"><XSquare size={16}/> FAIL</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4 bg-gray-50 border-t border-gray-300">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-800">Final Assessment Score</span>
              <span className="font-bold text-drdoblue text-lg">{score}%</span>
            </div>
            <div className="w-full bg-gray-300 h-4 rounded-sm overflow-hidden border border-gray-400">
              <motion.div initial={{width:0}} animate={{width:`${score}%`}} className={`h-4 ${score >= 75 ? 'bg-green-600' : 'bg-red-600'}`} transition={{duration:1}} />
            </div>
          </div>

          <div className="p-4 text-center bg-white border-t border-gray-300 rounded-b">
            {eligible ? (
              <div className="inline-flex items-center gap-2 border-2 border-green-600 bg-green-100 text-green-900 px-8 py-3 rounded text-lg font-black tracking-widest shadow">
                <CheckSquare /> ELIGIBLE
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 border-2 border-red-600 bg-red-100 text-red-900 px-8 py-3 rounded text-lg font-black tracking-widest shadow">
                <AlertTriangle /> REJECTED
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
