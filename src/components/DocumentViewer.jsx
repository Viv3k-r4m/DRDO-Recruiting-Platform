import React, { useState } from 'react'
import { motion } from 'framer-motion'

export default function DocumentViewer({ documents = [] }){
  const [preview, setPreview] = useState(null)

  const items = documents.map((document) => ({ key: document.name, title: document.name, src: document.previewUrl }))
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Document Viewer</h3>
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" initial={{opacity:0}} animate={{opacity:1}}>
        {items.map((it, idx)=>(
          <motion.div key={it.key} className="bg-white rounded-xl shadow p-3 cursor-pointer" whileHover={{scale:1.02}} onClick={()=>setPreview(it)}>
            <div className="text-sm text-gray-600 mb-2">{it.title}</div>
            {it.src ? <img src={it.src} alt={it.title} className="w-full h-40 object-contain rounded" /> : <div className="flex h-40 items-center justify-center rounded bg-slate-100 text-sm text-slate-500">Preview unavailable</div>}
          </motion.div>
        ))}
      </motion.div>

      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={()=>setPreview(null)}>
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-lg overflow-hidden p-4 max-w-3xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{preview.title}</div>
              <button onClick={()=>setPreview(null)} className="text-gray-500">Close</button>
            </div>
            <img src={preview.src} alt={preview.title} className="w-full h-[60vh] object-contain" />
          </motion.div>
        </div>
      )}
    </div>
  )
}
