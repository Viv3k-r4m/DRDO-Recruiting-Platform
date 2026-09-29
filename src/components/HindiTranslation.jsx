import React from 'react'
import { Languages } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HindiTranslation({hindi, english}){
  return (
    <div>
      <div className="bg-drdoblue text-white px-4 py-2 font-bold mb-4 rounded-t border-b-4 border-saffron flex items-center gap-2">
        <Languages size={18} />
        Linguistic Verification (Hindi to English)
      </div>
      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="border border-gray-300 rounded overflow-hidden">
        <div className="bg-gray-100 p-2 font-bold text-gray-700 text-sm border-b border-gray-300">
          Source Material (Hindi text detected)
        </div>
        <div className="p-3 bg-white text-gray-900 font-serif text-lg">
          {hindi || '-'}
        </div>
        <div className="bg-gray-100 p-2 font-bold text-gray-700 text-sm border-b border-gray-300 border-t">
          Official Translation
        </div>
        <div className="p-3 bg-green-50 text-green-900 font-bold border-b-2 border-green-200">
          Evaluated Category: {english || '-'}
        </div>
      </motion.div>
    </div>
  )
}
