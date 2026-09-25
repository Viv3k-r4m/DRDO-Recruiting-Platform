import React from 'react'
import { motion } from 'framer-motion'

export default function StatusCards({extracted}){
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="card">
        <div className="text-sm text-gray-500">GATE</div>
        <div className="font-semibold text-lg">{extracted.gate.score}</div>
        <div className="text-sm text-gray-500">AIR {extracted.gate.air}</div>
      </motion.div>
      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} transition={{delay:0.08}} className="card">
        <div className="text-sm text-gray-500">B.Tech CGPA</div>
        <div className="font-semibold text-lg">9.17</div>
        <div className="text-sm text-gray-500">First Class with Distinction</div>
      </motion.div>
      <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} transition={{delay:0.16}} className="card">
        <div className="text-sm text-gray-500">Class 12</div>
        <div className="font-semibold text-lg">93.60%</div>
        <div className="text-sm text-gray-500">Distinction (2022)</div>
      </motion.div>
    </div>
  )
}
