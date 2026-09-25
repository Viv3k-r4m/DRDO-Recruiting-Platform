import React, { useRef, useState } from 'react'
import { FolderOpen, UploadCloud } from 'lucide-react'
import { motion } from 'framer-motion'

export default function UploadZone({ onFiles, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const choose = (files) => files?.length && onFiles(files)
  return <motion.div whileHover={{ scale: disabled ? 1 : 1.01 }} className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${dragging ? 'border-govblue bg-blue-50' : 'border-slate-300 bg-white'} ${disabled ? 'opacity-60' : 'cursor-pointer'}`} onClick={() => !disabled && inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files) }}>
    <input ref={inputRef} type="file" webkitdirectory="true" directory="true" multiple hidden onChange={(event) => choose(event.target.files)} />
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-govblue"><UploadCloud size={28} /></div>
    <h3 className="text-lg font-semibold text-slate-900">Select the Documents folder</h3>
    <p className="mt-2 text-sm text-slate-500">Choose the folder containing the six candidate documents. PNG, JPG, JPEG, and PDF files are supported.</p>
    <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600"><FolderOpen size={14} /> Folder selection</div>
  </motion.div>
}