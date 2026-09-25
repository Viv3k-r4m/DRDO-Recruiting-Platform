import React from 'react'
import { motion } from 'framer-motion'

export default function HindiTranslation({hindi, english}){
  return (
    <div>
      <h4 className="font-semibold mb-2">Hindi → English Translation</h4>
      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="p-3 bg-sky-50 rounded-lg">
        <div className="text-sm text-gray-600">Original (Hindi)</div>
        <div className="mt-2 p-3 bg-white rounded-md shadow-sm">{hindi}</div>
        <div className="text-sm text-gray-600 mt-3">English Translation</div>
        <div className="mt-2 p-3 bg-white rounded-md shadow-sm">Category: {english} (General)</div>
      </motion.div>
    </div>
  )
}
