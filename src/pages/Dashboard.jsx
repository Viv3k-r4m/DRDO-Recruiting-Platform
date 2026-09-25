import React, { useState } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import UploadZone from '../components/UploadZone'
import ProgressOverlay from '../components/ProgressOverlay'
import DocumentViewer from '../components/DocumentViewer'
import ComparisonTable from '../components/ComparisonTable'
import HindiTranslation from '../components/HindiTranslation'
import EligibilityChecklist from '../components/EligibilityChecklist'
import { collectDocuments } from '../utils/documents'
import { recognizeAll } from '../utils/ocr'
import { verifyWithOllama } from '../utils/ollama'

const emptyApplication = { name: '', fatherName: '', dob: '', category: '', class12: '', btech: '', gate: {} }

export default function Dashboard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(-1)
  const [error, setError] = useState('')
  const [documents, setDocuments] = useState([])
  const [extracted, setExtracted] = useState(null)
  const [verification, setVerification] = useState(null)

  async function processDocuments(fileList) {
    setError(''); setExtracted(null); setVerification(null); setStep(0)
    try {
      const files = collectDocuments(fileList)
      setStep(1)
      const ocrDocuments = await recognizeAll(files, () => {})
      setDocuments(ocrDocuments)
      setStep(2)
      setStep(3)
      const result = await verifyWithOllama(ocrDocuments, emptyApplication)
      setExtracted(result.extracted)
      setStep(4)
      setVerification({ ...result.verification, source: result.source, warning: result.warning })
      setStep(5)
    } catch (caught) {
      setError(caught.message || 'Verification failed. Please check the selected Documents folder.')
      setStep(-1)
    }
  }

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#dbeafe,_transparent_38%),#f8fafc]">
    <header className="border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur md:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govblue text-white"><ShieldCheck size={22} /></div><div><h1 className="font-semibold text-slate-900">RAC DRDO</h1><p className="text-xs text-slate-500">SIH1652 / Admin verification console</p></div></div><button onClick={() => navigate('/')} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><LogOut size={16} /> Logout</button></div></header>
    <main className="mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-10"><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><p className="text-sm font-semibold uppercase tracking-[0.2em] text-govblue">Documents folder</p><h2 className="mt-2 text-3xl font-semibold text-slate-900">Document verification</h2><p className="mt-2 max-w-2xl text-slate-600">Select the candidate documents folder to extract, translate, cross-check, and assess eligibility.</p></motion.div>
      <UploadZone onFiles={processDocuments} disabled={step >= 0 && step < 5} />
      {step >= 0 && step < 5 && <ProgressOverlay step={step} error={error} />}
      {error && step === -1 && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {extracted && <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><div className="card"><p className="text-xs uppercase tracking-wider text-slate-500">Candidate</p><p className="mt-2 text-xl font-semibold">{extracted.name}</p><p className="text-sm text-slate-500">{extracted.dob} / {extracted.category}</p></div><div className="card"><p className="text-xs uppercase tracking-wider text-slate-500">GATE</p><p className="mt-2 text-xl font-semibold">{extracted.gate.score}</p><p className="text-sm text-slate-500">{extracted.gate.paper} / {extracted.gate.year}</p></div><div className="card"><p className="text-xs uppercase tracking-wider text-slate-500">Verification engine</p><p className="mt-2 text-xl font-semibold">{verification?.source}</p><p className="text-sm text-slate-500">{verification?.score}% eligibility score</p></div></div>
        {verification?.warning && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Ollama was unavailable, so the local deterministic verifier was used: {verification.warning}</div>}
        <DocumentViewer documents={documents} />
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]"><div className="card overflow-x-auto"><h3 className="mb-4 text-lg font-semibold">Documents vs Application Form</h3><ComparisonTable extracted={extracted} application={extracted.application || emptyApplication} show /></div><div className="space-y-6"><div className="card"><HindiTranslation hindi={extracted.casteHindiText} english={extracted.category} /></div><div className="card"><EligibilityChecklist verification={verification} show /></div></div></div>
      </motion.section>}
    </main><footer className="px-5 py-8 text-center text-xs text-slate-500">Demo for SIH1652 | Sample documents for project testing only</footer>
  </div>
}
