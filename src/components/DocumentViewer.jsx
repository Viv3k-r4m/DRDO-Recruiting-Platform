import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FileSearch, X } from 'lucide-react'

export default function DocumentViewer({ documents = [] }){
  const [preview, setPreview] = useState(null)

  const items = documents.map((document) => ({ key: document.name, title: document.name, src: document.previewUrl }))
  return (
    <div className="mb-6">
      <div className="bg-drdoblue text-white px-4 py-2 font-bold mb-4 rounded-t border-b-4 border-saffron flex items-center gap-2">
        <FileSearch size={18} />
        Scanned Documents Preview
      </div>
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" initial={{opacity:0}} animate={{opacity:1}}>
        {items.map((it, idx)=>(
          <div key={it.key} className="bg-white border border-gray-300 rounded shadow-sm hover:shadow-md transition-shadow cursor-pointer p-2 flex flex-col" onClick={()=>setPreview(it)}>
            <div className="bg-gray-100 p-2 font-bold text-xs text-gray-700 truncate border-b border-gray-200 mb-2">{it.title}</div>
            <div className="flex-1 bg-gray-50 flex items-center justify-center p-2 border border-dashed border-gray-200 relative overflow-hidden">
              {it.src ? <img src={it.src} alt={it.title} className="w-full h-32 object-contain hover:scale-105 transition-transform" /> : <div className="text-sm text-gray-500">Preview unavailable</div>}
            </div>
          </div>
        ))}
      </motion.div>

      {preview && (
        <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50 p-4" onClick={()=>setPreview(null)}>
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white border border-gray-400 rounded shadow-2xl flex flex-col max-w-4xl w-full h-[80vh]" onClick={e=>e.stopPropagation()}>
            <div className="bg-drdoblue text-white px-4 py-3 flex items-center justify-between">
              <div className="font-bold">{preview.title}</div>
              <button onClick={()=>setPreview(null)} className="text-white hover:text-saffron transition-colors"><X size={24}/></button>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-gray-100 flex items-center justify-center">
              <img src={preview.src} alt={preview.title} className="max-w-full max-h-full object-contain border border-gray-300 shadow-sm" />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
