import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  CheckCircle2, 
  FileText, 
  Clock, 
  X, 
  ShieldCheck,
  FileCheck2
} from 'lucide-react'

export default function DocumentVerificationScanner3D({
  app,
  queueIndex = 1,
  queueTotal = 1,
  modalState = 'Inspecting applicant documents...',
  onClose
}) {
  // Normalize candidate's document list
  const docList = useMemo(() => {
    const defaultDocs = [
      '10th_Marksheet.pdf',
      '12th_Marksheet.pdf',
      'B.Tech_Degree.pdf',
      'GATE_Scorecard.pdf',
      'Caste_Certificate.pdf',
      'Application_Form.pdf'
    ]

    if (app?.documents && Array.isArray(app.documents) && app.documents.length > 0) {
      return app.documents.map(d => (typeof d === 'string' ? d : d.name))
    }
    return defaultDocs
  }, [app])

  // Detect which document is currently being inspected from modalState text
  const currentDocIndex = useMemo(() => {
    const s = modalState.toLowerCase()
    const foundIdx = docList.findIndex(doc => s.includes(doc.toLowerCase()))
    if (foundIdx !== -1) return foundIdx

    // Fallbacks based on keywords
    if (s.includes('10th')) return docList.findIndex(d => d.toLowerCase().includes('10th'))
    if (s.includes('12th')) return docList.findIndex(d => d.toLowerCase().includes('12th'))
    if (s.includes('gate') || s.includes('score')) return docList.findIndex(d => d.toLowerCase().includes('gate'))
    if (s.includes('btech') || s.includes('degree')) return docList.findIndex(d => d.toLowerCase().includes('btech') || d.toLowerCase().includes('degree'))
    if (s.includes('caste') || s.includes('category')) return docList.findIndex(d => d.toLowerCase().includes('caste'))
    if (s.includes('application')) return docList.findIndex(d => d.toLowerCase().includes('application'))

    // Default to first doc if downloading/authenticity, or middle
    if (s.includes('download') || s.includes('authenticity')) return 0
    return Math.min(2, docList.length - 1)
  }, [modalState, docList])

  const activeDocName = docList[currentDocIndex >= 0 ? currentDocIndex : 0] || 'Official Document'

  const progressPct = Math.min(100, Math.round((queueIndex / (queueTotal || 1)) * 100))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-xs">
      {/* Compact Dialog Window */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-gray-300 overflow-hidden flex flex-col text-gray-800"
      >
        {/* National Tricolor Top Bar */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-saffron"></div>
          <div className="h-full w-1/3 bg-white border-y border-gray-200"></div>
          <div className="h-full w-1/3 bg-indiagreen"></div>
        </div>

        {/* Header with DRDO Crest */}
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-drdoblue flex items-center justify-center p-0.5 bg-white shrink-0 shadow-xs">
              <img 
                src="/drdo_logo.svg" 
                alt="DRDO Crest" 
                className="h-full w-full object-contain" 
                onError={(e) => { e.currentTarget.src = '/emblem.svg' }} 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-drdoblue">
                  भर्ती एवं मूल्यांकन केंद्र (रेक) | RAC DRDO
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-800">
                Verifying: <span className="text-drdoblue">{app?.name || 'Candidate Package'}</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 bg-white border border-gray-300 px-2 py-0.5 rounded">
              {queueIndex} / {queueTotal}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                title="Dismiss overlay"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">

          {/* Interactive Document Paper with Animated Magnifying Glass */}
          <div className="relative bg-amber-50/50 border border-amber-200/90 rounded-lg p-4 overflow-hidden shadow-xs">
            {/* Paper Watermark */}
            <div className="absolute right-3 top-2 opacity-10 pointer-events-none w-24 h-24">
              <img src="/drdo_logo.svg" alt="Watermark" className="w-full h-full object-contain" />
            </div>

            {/* Document Header Line */}
            <div className="flex items-center justify-between border-b border-amber-200 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <FileText size={15} className="text-drdoblue" />
                <span className="truncate max-w-[240px]">{activeDocName}</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                SCANNING
              </span>
            </div>

            {/* Document Content Mockup with Text Lines */}
            <div className="space-y-2 relative select-none">
              <div className="flex items-center justify-between text-[11px] text-gray-600 font-mono">
                <span>Name: <strong className="text-gray-800 font-sans">{app?.name || 'Verified Candidate'}</strong></span>
                <span className="text-[10px] text-gray-400">ROLL: 2025-DRDO-842</span>
              </div>

              {/* Simulated text lines */}
              <div className="space-y-1.5 opacity-80">
                <div className="h-2 bg-gray-200 rounded w-full"></div>
                <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                <div className="flex gap-2">
                  <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-2 bg-amber-200 rounded w-1/3"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded w-4/5"></div>
              </div>

              {/* Animated Magnifying Glass that sweeps over the document */}
              <motion.div
                animate={{
                  x: [15, 180, 75, 230, 40, 15],
                  y: [0, 25, 45, 15, 35, 0]
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="absolute top-0 left-0 pointer-events-none z-20 flex items-center"
              >
                {/* Glowing Magnifier Ring */}
                <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white/90 border-2 border-drdoblue shadow-[0_4px_16px_rgba(0,72,144,0.35)] backdrop-blur-xs">
                  {/* Lens Glass Reflection */}
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-blue-100/50 via-transparent to-saffron/20 border border-blue-200"></div>
                  {/* Lens Crosshair */}
                  <div className="absolute w-2 h-2 rounded-full border border-drdoblue/50"></div>
                  <Search size={18} className="text-drdoblue drop-shadow-xs" />
                </div>
                {/* Detected Stamp Tag trailing the lens */}
                <motion.span
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="ml-2 text-[10px] font-bold bg-drdoblue text-white px-2 py-0.5 rounded shadow-sm whitespace-nowrap flex items-center gap-1"
                >
                  <ShieldCheck size={11} className="text-saffron" />
                  <span>Found: Authentic</span>
                </motion.span>
              </motion.div>
            </div>
          </div>

          {/* Document Processing Queue (Step by step list) */}
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/70">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center justify-between">
              <span>Candidate Certificate Package</span>
              <span className="text-[11px] font-normal text-gray-500">Checking seals & signatures</span>
            </p>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
              {docList.map((docName, idx) => {
                const isCurrent = idx === currentDocIndex
                const isPassed = idx < currentDocIndex

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded border transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 border-drdoblue text-drdoblue font-bold shadow-xs'
                        : isPassed
                        ? 'bg-emerald-50/80 border-emerald-200 text-gray-700'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isPassed ? (
                        <CheckCircle2 size={15} className="text-indiagreen shrink-0" />
                      ) : isCurrent ? (
                        <Search size={15} className="text-drdoblue animate-pulse shrink-0" />
                      ) : (
                        <Clock size={15} className="text-gray-300 shrink-0" />
                      )}
                      <span className="truncate">{docName}</span>
                    </div>

                    <span className="text-[10px] font-mono shrink-0 ml-2">
                      {isPassed && (
                        <span className="text-indiagreen font-bold">VERIFIED</span>
                      )}
                      {isCurrent && (
                        <span className="text-drdoblue bg-blue-100 px-1.5 py-0.5 rounded animate-pulse font-bold">
                          INSPECTING
                        </span>
                      )}
                      {!isPassed && !isCurrent && (
                        <span className="text-gray-400">QUEUED</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Current Engine Status */}
          <div className="bg-blue-50 border-l-4 border-drdoblue p-3 rounded-r text-xs text-blue-950 flex items-start gap-2.5">
            <FileCheck2 size={16} className="text-drdoblue shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-drdoblue">Verification Engine Status:</p>
              <p className="font-mono text-[11px] text-gray-700 mt-0.5 break-words">
                {modalState}
              </p>
            </div>
          </div>

          {/* Batch Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-bold text-gray-600">
              <span>Candidate {queueIndex} of {queueTotal}</span>
              <span className="text-drdoblue">{progressPct}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <motion.div
                className="bg-drdoblue h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  )
}
