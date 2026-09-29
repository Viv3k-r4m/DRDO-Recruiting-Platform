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
  
  // Resume specific state
  const [resumeData, setResumeData] = useState(null)
  const [resumeAnalyzing, setResumeAnalyzing] = useState(false)

  async function processDocuments(fileList) {
    setError(''); setExtracted(null); setVerification(null); setResumeData(null); setStep(0)
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
      
      // We don't save to localStorage here if they are eligible.
      // If NOT eligible, we can save immediately since there is no resume step.
      if (!result.verification?.eligible) {
        saveCandidateData(result.extracted, result.verification, 'N/A (Rejected)')
      }
      
      setStep(5)
    } catch (caught) {
      setError(caught.message || 'Verification failed. Please check the selected Documents folder.')
      setStep(-1)
    }
  }

  function saveCandidateData(candidateExtracted, candidateVerification, role) {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('drdo_logs') || '[]')
      const newLog = {
        id: 'APP-' + Math.floor(Math.random() * 9000 + 1000),
        name: candidateExtracted.name || 'Unknown Candidate',
        gate: candidateExtracted.gate?.score || 'N/A',
        status: candidateVerification?.eligible ? 'Eligible' : 'Rejected',
        role: role,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
      localStorage.setItem('drdo_logs', JSON.stringify([newLog, ...existingLogs]))
    } catch (e) {
      console.error('Failed to save log', e)
    }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setResumeAnalyzing(true)
    try {
      // Simulate OCR processing time
      await new Promise(r => setTimeout(r, 2500))
      
      // We would normally pass this to recognizeDocument, but we mock the parsing result for demonstration
      // We randomly assign a role or base it on file name to simulate NLP
      const mockText = file.name.toLowerCase()
      let determinedRole = 'Technical Officer'
      if (mockText.includes('ai') || mockText.includes('machine') || mockText.includes('data')) {
        determinedRole = mockText.includes('data') ? 'Data Engineer' : 'Scientist B (AI)'
      } else if (mockText.includes('cyber') || mockText.includes('security')) {
        determinedRole = 'Scientist B (Cybersecurity)'
      }

      setResumeData({
        fileName: file.name,
        role: determinedRole
      })
      
      // Now save the eligible candidate to the tracker with the determined role
      saveCandidateData(extracted, verification, determinedRole)

    } catch (err) {
      console.error(err)
    } finally {
      setResumeAnalyzing(false)
    }
  }

  return <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
    {/* Top Gov Bar */}
    <div className="bg-navy text-white py-1 px-4 text-xs flex justify-between items-center z-10 relative">
      <div className="flex gap-4">
        <span>भारत सरकार | GOVERNMENT OF INDIA</span>
        <span className="hidden md:inline">रक्षा मंत्रालय | MINISTRY OF DEFENCE</span>
      </div>
      <div className="flex gap-4 text-gray-300">
        <span className="font-bold text-white">ADMIN: admin@rac.gov.in</span>
      </div>
    </div>

    {/* Main Header */}
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white shadow-md relative z-20"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Satyameva Jayate" className="h-14" />
          <div className="border-l-2 border-gray-300 h-10 mx-2"></div>
          <div>
            <h1 className="text-xl font-bold text-drdoblue leading-tight">भर्ती एवं मूल्यांकन केंद्र (रेक)</h1>
            <h2 className="text-sm font-bold text-gray-700">Recruitment & Assessment Centre (RAC)</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 rounded bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-300 shadow transition-colors border border-gray-400">
            Back to Dashboard
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 shadow transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
      <div className="h-1 w-full flex">
        <div className="h-full w-1/3 bg-saffron"></div>
        <div className="h-full w-1/3 bg-white"></div>
        <div className="h-full w-1/3 bg-indiagreen"></div>
      </div>
    </motion.header>

    <main className="mx-auto max-w-7xl w-full space-y-6 px-4 py-8 flex-1">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2.5 w-2.5 bg-green-600 rounded-full animate-pulse shadow"></div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-700">System Ready / Secure</p>
        </div>
        <h2 className="text-2xl font-bold text-drdoblue border-b-2 border-drdoblue pb-2 inline-block">Document Verification Module</h2>
        <p className="mt-2 text-gray-600 text-sm max-w-3xl">Upload candidate document packages to automatically extract details, perform OCR, verify authenticity, and calculate eligibility scores for SIH1652.</p>
      </motion.div>
      <UploadZone onFiles={processDocuments} disabled={step >= 0 && step < 5} />
      {step >= 0 && step < 5 && <ProgressOverlay step={step} error={error} />}
      {error && step === -1 && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {extracted && <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6"><div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-2 mb-2">Candidate Profile</p>
          <p className="text-xl font-black text-drdoblue">{extracted.name}</p>
          <p className="text-sm text-gray-700 font-semibold">{extracted.dob} | {extracted.category}</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-2 mb-2">GATE Credential</p>
          <p className="text-xl font-black text-drdoblue">Score: {extracted.gate.score}</p>
          <p className="text-sm text-gray-700 font-semibold">{extracted.gate.paper} / {extracted.gate.year}</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-2 mb-2">Verification Engine Status</p>
          <p className="text-xl font-black text-drdoblue">{verification?.source}</p>
          <p className="text-sm text-gray-700 font-semibold">{verification?.score}% Final Eligibility Score</p>
        </div>
      </div>
        {verification?.warning && <div className="border-l-4 border-saffron bg-yellow-50 p-4 text-sm font-bold text-yellow-900 shadow-sm">⚠️ Offline Fallback: Ollama was unavailable, so the local deterministic verifier was used ({verification.warning})</div>}
        <DocumentViewer documents={documents} />
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]"><div className="card p-0 overflow-hidden"><ComparisonTable extracted={extracted} application={extracted.application || emptyApplication} show /></div><div className="space-y-6"><div className="card p-0 overflow-hidden"><HindiTranslation hindi={extracted.casteHindiText} english={extracted.category} /></div><div className="card p-0 overflow-hidden"><EligibilityChecklist verification={verification} show /></div></div></div>
        
        {/* RESUME PARSING MODULE */}
        {verification?.eligible && (
          <div className="card mt-8 p-6 border-t-4 border-t-green-600 bg-white">
            <h3 className="text-lg font-bold text-drdoblue border-b-2 border-gray-200 pb-2 mb-4">Step 2: Resume NLP & Role Assignment</h3>
            <p className="text-sm text-gray-600 mb-4">Candidate is <strong>ELIGIBLE</strong>. Please upload the candidate's Resume/CV to automatically extract their skills and assign the appropriate RAC Role before sending them to the Applicant Tracker.</p>
            
            {!resumeData && !resumeAnalyzing && (
              <div className="border-2 border-dashed border-gray-300 rounded p-6 text-center hover:bg-gray-50 transition-colors">
                <input type="file" id="resumeUpload" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
                <label htmlFor="resumeUpload" className="cursor-pointer flex flex-col items-center justify-center">
                  <div className="bg-drdoblue text-white px-4 py-2 rounded shadow font-bold mb-2">Upload Resume for Analysis</div>
                  <span className="text-xs text-gray-500">PDF, DOCX up to 5MB</span>
                </label>
              </div>
            )}

            {resumeAnalyzing && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-drdoblue mx-auto mb-3"></div>
                <p className="text-sm font-bold text-drdoblue animate-pulse">Performing OCR & NLP Parsing...</p>
                <p className="text-xs text-gray-500">Extracting Technical Skills & Domain Experience</p>
              </div>
            )}

            {resumeData && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-green-50 border border-green-200 rounded p-4 text-center">
                <div className="text-green-600 mb-2">
                  <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h4 className="font-bold text-gray-800 text-lg mb-1">Resume Parsed Successfully</h4>
                <p className="text-sm text-gray-600">File: {resumeData.fileName}</p>
                <div className="my-4 inline-block bg-white border border-gray-300 shadow-sm px-6 py-3 rounded">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Assigned Role</p>
                  <p className="text-xl font-black text-drdoblue">{resumeData.role}</p>
                </div>
                <p className="text-sm font-semibold text-green-700">Candidate has been saved to the Applicant Tracker.</p>
                <button onClick={() => navigate('/dashboard')} className="mt-4 bg-drdoblue text-white px-6 py-2 rounded shadow font-bold hover:bg-drdolight transition-colors">
                  Open Applicant Tracker
                </button>
              </motion.div>
            )}
          </div>
        )}

      </motion.section>}
    </main><footer className="px-5 py-8 text-center text-xs text-slate-500">Demo for SIH1652 | Sample documents for project testing only</footer>
  </div>
}
