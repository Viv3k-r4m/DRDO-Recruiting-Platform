import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, UploadCloud, CheckCircle, Clock, FileText, FileSearch } from 'lucide-react'
import { auth, db } from '../firebase'
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'

export default function ApplicantDashboard() {
  const navigate = useNavigate()
  const [appData, setAppData] = useState(null)
  
  // Form states
  const [uploading, setUploading] = useState(false)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [files, setFiles] = useState([])
  const [ocrProgress, setOcrProgress] = useState('')

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/')
        return
      }

      const q = query(collection(db, 'applications'), where('uid', '==', user.uid))
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setAppData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() })
        }
      }, (error) => {
        console.error("Firebase error (make sure config is valid):", error)
      })

      return () => unsubscribeSnapshot()
    })

    return () => unsubscribeAuth()
  }, [navigate])

  async function handleApplicationSubmit(e) {
    e.preventDefault()
    if (!auth.currentUser) return
    if (files.length === 0) {
      alert("Please upload your document package.")
      return
    }
    
    setUploading(true)
    
    try {
      setOcrProgress('Uploading secure documents locally...')
      
      const fileDataUrls = []
      
      for (const f of files) {
        setOcrProgress(`Uploading ${f.name}...`)
        
        // Read file as Base64 to send to our custom Vite plugin
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.readAsDataURL(f)
        })
        
        // Post to our local Vite server endpoint
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: f.name, 
            base64,
            applicantId: auth.currentUser.uid
          })
        })
        
        if (!res.ok) throw new Error('Failed to upload file locally')
        const data = await res.json()
        
        // Save the local URL in Firestore
        fileDataUrls.push({ name: f.name, data: data.url })
      }
      
      setOcrProgress('Finalizing Application...')
      
      await addDoc(collection(db, 'applications'), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        name: "Pending AI Extraction",
        documents: fileDataUrls,
        status: 'Pending',
        role: null,
        createdAt: serverTimestamp(),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      })
    } catch (err) {
      console.error('Error submitting application:', err)
      alert('Upload failed! Check console.')
    } finally {
      setUploading(false)
      setOcrProgress('')
    }
  }

  async function handleResumeSubmit(e) {
    const file = e.target.files[0]
    if(!file || !appData) return
    setResumeUploading(true)
    
    try {
      // 1. Upload Resume locally using existing endpoint
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.readAsDataURL(file)
      })
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: `resume_${file.name}`, 
          base64,
          applicantId: auth.currentUser.uid
        })
      })
      
      if (!res.ok) throw new Error('Failed to upload resume')
      const data = await res.json()

      // 2. Update Firestore Status (No role assignment yet, Admin does that)
      const appRef = doc(db, 'applications', appData.id)
      await updateDoc(appRef, {
        status: 'ResumeSubmitted',
        resumeUrl: data.url
      })
    } catch (err) {
      console.error('Error uploading resume:', err)
      alert("Failed to upload resume.")
    } finally {
      setResumeUploading(false)
    }
  }
  
  async function handleLogout() {
    await signOut(auth)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      <div className="bg-navy text-white py-1 px-4 text-xs flex justify-between items-center z-10 relative">
        <div className="flex gap-4">
          <span>भारत सरकार | GOVERNMENT OF INDIA</span>
          <span className="hidden md:inline">रक्षा मंत्रालय | MINISTRY OF DEFENCE</span>
        </div>
        <div className="flex gap-4 text-gray-300">
          <span className="font-bold text-white">APPLICANT: {auth.currentUser?.email}</span>
        </div>
      </div>

      <header className="bg-white shadow-md relative z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full border-2 border-drdoblue flex items-center justify-center p-0.5 bg-white shrink-0 overflow-hidden shadow-xs">
              <img src="/drdo_logo.svg" alt="DRDO Logo" className="h-full w-full object-contain" onError={(e) => { e.currentTarget.src = '/emblem.svg' }} />
            </div>
            <div className="border-l-2 border-gray-300 h-10 mx-1 sm:mx-2"></div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-drdoblue leading-tight">भर्ती एवं मूल्यांकन केंद्र (रेक)</h1>
              <h2 className="text-xs sm:text-sm font-bold text-gray-700">Recruitment & Assessment Centre (RAC)</h2>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 shadow transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-saffron"></div>
          <div className="h-full w-1/3 bg-white border-y border-gray-300"></div>
          <div className="h-full w-1/3 bg-indiagreen"></div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl w-full space-y-6 px-4 py-8 flex-1">
        
        {!appData ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-300 shadow-md rounded-lg p-6 md:p-8 border-t-4 border-t-drdoblue">
            <h2 className="text-2xl font-bold text-drdoblue mb-4 border-b-2 border-gray-200 pb-2">New Recruitment Application</h2>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-sm text-blue-900 mb-6 flex items-start gap-3">
              <FileText className="text-drdoblue shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-drdoblue">Automatic Candidate & Document Verification (SIH1652)</p>
                <p className="text-xs text-blue-800 mt-1">
                  Your official Candidate Name and Father's Name will be extracted directly from your uploaded <code>application_form.pdf</code> and <code>10th marksheet</code> by our AI OCR engine. Please upload all authentic scans together.
                </p>
              </div>
            </div>

            <form onSubmit={handleApplicationSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Document Package Scans
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                  <span className="flex items-center gap-1.5 font-medium"><CheckCircle size={14} className="text-green-600" /> 10th Marksheet</span>
                  <span className="flex items-center gap-1.5 font-medium"><CheckCircle size={14} className="text-green-600" /> 12th Marksheet</span>
                  <span className="flex items-center gap-1.5 font-medium"><CheckCircle size={14} className="text-green-600" /> B.Tech Marksheet</span>
                  <span className="flex items-center gap-1.5 font-medium"><CheckCircle size={14} className="text-green-600" /> Caste Certificate</span>
                  <span className="flex items-center gap-1.5 font-medium"><CheckCircle size={14} className="text-green-600" /> GATE Scorecard</span>
                  <span className="flex items-center gap-1.5 font-medium"><CheckCircle size={14} className="text-green-600" /> Application Form</span>
                </div>

                <div className="border-2 border-dashed border-gray-300 p-6 md:p-8 text-center rounded-lg bg-gray-50 hover:bg-gray-100/70 transition-colors">
                  <UploadCloud className="mx-auto text-drdoblue/60 mb-3" size={38} />
                  <p className="text-sm text-gray-700 font-bold mb-1">Upload Document Scans / PDF Package</p>
                  <p className="text-xs text-gray-500 mb-3">Select all required certificate scans together (.pdf, .jpg, .png)</p>
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-drdoblue text-white text-xs font-bold px-4 py-2 rounded shadow hover:bg-drdolight transition-colors">
                    <span>Browse Local Files</span>
                    <input required type="file" multiple onChange={e => setFiles(Array.from(e.target.files))} className="hidden" />
                  </label>
                  
                  {files.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200 text-left">
                      <p className="text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                        <span>Selected Files ({files.length}):</span>
                        <button type="button" onClick={() => setFiles([])} className="text-[11px] text-red-600 hover:underline">Clear All</button>
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                        {files.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-white border border-gray-300 text-gray-800 text-[11px] px-2.5 py-1 rounded shadow-xs">
                            <FileText size={12} className="text-drdoblue" />
                            <span className="max-w-[200px] truncate">{f.name}</span>
                            <span className="text-[10px] text-gray-500">({Math.round(f.size / 1024)} KB)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={uploading || files.length === 0} 
                className="w-full bg-drdoblue text-white font-bold py-3 rounded-md hover:bg-drdolight transition-colors shadow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Processing Document Upload...</span>
                  </>
                ) : (
                  <span>Submit Application for Screening</span>
                )}
              </button>

              {uploading && ocrProgress && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-drdoblue border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm font-bold text-drdoblue">{ocrProgress}</p>
                  <p className="text-xs text-gray-500 mt-1">Please do not close this window. Uploading files safely.</p>
                </div>
              )}
            </form>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            
            {/* Application Overview Card */}
            <div className="bg-white border border-gray-300 shadow-md rounded-lg p-6 border-t-4 border-t-drdoblue">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Application Reference ID</p>
                  <p className="text-2xl font-black text-drdoblue">{appData.id.substring(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Submitted on: {appData.date || 'Recent'}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate Profile</p>
                  <p className="text-lg font-bold text-gray-800">{appData.name}</p>
                  <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    appData.status === 'RoleAssigned' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                    appData.status === 'Eligible' || appData.status.includes('Resume') ? 'bg-green-100 text-green-800 border border-green-200' :
                    appData.status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                    'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {appData.status === 'RoleAssigned' ? 'Shortlisted for Interview' :
                     appData.status === 'ResumeSubmitted' ? 'Resume Under Review' :
                     appData.status === 'Eligible' ? 'Eligible - Resume Required' :
                     appData.status === 'Rejected' ? 'Application Rejected' :
                     'Verification Pending'}
                  </span>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {appData.documents && appData.documents.length > 0 && (
                <div className="mt-4 pt-2">
                  <p className="text-xs font-bold text-gray-600 mb-2">Uploaded Document Package ({appData.documents.length} files):</p>
                  <div className="flex flex-wrap gap-2">
                    {appData.documents.map((docItem, idx) => {
                      const docName = typeof docItem === 'string' ? docItem : docItem.name
                      const docUrl = typeof docItem === 'object' ? docItem.data : null
                      return (
                        <span key={idx} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded border border-gray-200">
                          <FileText size={13} className="text-drdoblue" />
                          <span className="font-medium">{docName}</span>
                          {docUrl && (
                            <a href={docUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline ml-1">
                              [View]
                            </a>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Tracking Card */}
            <div className="bg-white border border-gray-300 shadow-md rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-3 mb-6">
                Recruitment Milestone Tracking
              </h3>
              
              {/* Reliable connected vertical stepper */}
              <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-200">
                
                {/* Step 1: Application Submission */}
                <div className="relative">
                  <div className="absolute -left-6 sm:-left-10 top-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 border-white bg-green-600 text-white shadow flex items-center justify-center font-bold text-xs sm:text-sm">
                    <CheckCircle size={18} />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-xs ml-3 sm:ml-4">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-gray-800 text-sm md:text-base">1. Application & Documents Submitted</h4>
                      <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">Completed</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Your certificate package has been encrypted and securely received on the RAC portal.
                    </p>
                  </div>
                </div>

                {/* Step 2: Verification Engine */}
                <div className="relative">
                  <div className={`absolute -left-6 sm:-left-10 top-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow flex items-center justify-center font-bold text-xs sm:text-sm ${
                    appData.status === 'Pending' ? 'bg-saffron text-white animate-pulse' :
                    appData.status === 'Rejected' ? 'bg-red-600 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {appData.status === 'Pending' ? <Clock size={18} /> : 
                     appData.status === 'Rejected' ? <LogOut size={18} /> : 
                     <CheckCircle size={18} />}
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-xs ml-3 sm:ml-4">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-gray-800 text-sm md:text-base">2. Automated Forensics & Eligibility Screening</h4>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        appData.status === 'Pending' ? 'text-amber-800 bg-amber-100' :
                        appData.status === 'Rejected' ? 'text-red-800 bg-red-100' :
                        'text-green-700 bg-green-100'
                      }`}>
                        {appData.status === 'Pending' ? 'In Progress' :
                         appData.status === 'Rejected' ? 'Verification Failed' :
                         'Verified & Eligible'}
                      </span>
                    </div>

                    {appData.status === 'Pending' && (
                      <p className="text-xs text-amber-700 font-medium">
                        Verification in queue. The RAC AI engine is analyzing your documents for authenticity, caste eligibility, and GATE thresholds.
                      </p>
                    )}

                    {appData.status === 'Rejected' && (
                      <div className="mt-2 bg-red-50 p-3 rounded border border-red-200">
                        <p className="text-xs text-red-700 font-bold mb-1">Eligibility Criteria Not Met:</p>
                        {appData.extractedData?.tamperAlerts?.length > 0 ? (
                          <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                            {appData.extractedData.tamperAlerts.map((alert, i) => <li key={i}>{alert}</li>)}
                          </ul>
                        ) : (
                          <p className="text-xs text-red-600">The uploaded scores or documents do not meet the minimum GATE cut-offs or degree requirements.</p>
                        )}
                      </div>
                    )}

                    {(appData.status === 'Eligible' || appData.status.includes('Resume') || appData.status === 'RoleAssigned') && (
                      <p className="text-xs text-green-700 font-medium">
                        Verified successfully! All eligibility criteria, age limits, and forensic parameters were met.
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 3: Resume Upload & Role Mapping */}
                {(appData.status === 'Eligible' || appData.status.includes('Resume') || appData.status === 'RoleAssigned') && (
                  <div className="relative">
                    <div className={`absolute -left-6 sm:-left-10 top-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow flex items-center justify-center font-bold text-xs sm:text-sm ${
                      appData.status === 'Eligible' ? 'bg-drdoblue text-white animate-bounce' :
                      appData.status === 'ResumeSubmitted' ? 'bg-amber-500 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      <FileSearch size={18} />
                    </div>
                    <div className={`rounded-lg p-4 shadow-xs ml-3 sm:ml-4 border ${
                      appData.status === 'Eligible' ? 'bg-blue-50/80 border-drdoblue/40' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-gray-800 text-sm md:text-base">3. Resume Upload & Role Allocation</h4>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          appData.status === 'Eligible' ? 'text-blue-800 bg-blue-100' :
                          appData.status === 'ResumeSubmitted' ? 'text-amber-800 bg-amber-100' :
                          'text-green-700 bg-green-100'
                        }`}>
                          {appData.status === 'Eligible' ? 'Action Required' :
                           appData.status === 'ResumeSubmitted' ? 'Under AI Review' :
                           'Role Allocated'}
                        </span>
                      </div>

                      {appData.status === 'Eligible' && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-drdoblue mb-3">
                            You are eligible! Please upload your latest Curriculum Vitae (CV) / Resume for AI specialization role mapping.
                          </p>
                          {!resumeUploading ? (
                            <label className="cursor-pointer inline-flex items-center gap-2 bg-drdoblue text-white px-5 py-2.5 rounded text-xs font-bold shadow hover:bg-drdolight transition-colors">
                              <UploadCloud size={16} />
                              <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeSubmit} />
                              Upload Resume (PDF)
                            </label>
                          ) : (
                            <div className="text-xs font-bold text-drdoblue flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-drdoblue border-t-transparent rounded-full"></div>
                              <span>Uploading and analyzing resume...</span>
                            </div>
                          )}
                        </div>
                      )}

                      {appData.status === 'ResumeSubmitted' && (
                        <div className="mt-2 text-amber-800">
                          <p className="text-xs font-bold">Resume Received.</p>
                          <p className="text-xs text-gray-600 mt-0.5">The administrator and AI matching model are reviewing your CV for final role assignment.</p>
                        </div>
                      )}

                      {appData.status === 'RoleAssigned' && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 mb-1">Candidate mapped to technical specialization:</p>
                          <span className="text-xs md:text-sm font-black text-green-800 bg-green-100 border border-green-300 px-3 py-1 rounded inline-block shadow-xs">
                            Assigned Role: {appData.role}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Interview Shortlist & Schedule */}
                {appData.status === 'RoleAssigned' && (
                  <div className="relative">
                    <div className="absolute -left-6 sm:-left-10 top-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow flex items-center justify-center font-bold text-xs sm:text-sm bg-indigo-600 text-white animate-pulse">
                      <CheckCircle size={18} />
                    </div>
                    <div className="bg-indigo-50/80 border-2 border-indigo-200 rounded-lg p-4 shadow-xs ml-3 sm:ml-4">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-gray-800 text-sm md:text-base">4. Interview Process & Schedule</h4>
                        <span className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider">Shortlisted</span>
                      </div>
                      <div className="mt-2 text-indigo-950">
                        <p className="text-xs font-bold text-indigo-800">
                          Shortlisted for interview for role: <span className="underline">{appData.role}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Interview details will be announced later. Please check your registered email regularly for updates regarding your interview slot, venue, and reporting instructions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>
      
      <footer className="bg-gray-800 text-white text-center py-4 text-xs mt-auto">
        <p>© Copyright {new Date().getFullYear()} RAC DRDO, Ministry of Defence, Govt. of India. All Rights Reserved.</p>
      </footer>
    </div>
  )
}
