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
          <div className="flex items-center gap-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Satyameva Jayate" className="h-14" />
            <div className="border-l-2 border-gray-300 h-10 mx-2"></div>
            <div>
              <h1 className="text-xl font-bold text-drdoblue leading-tight">भर्ती एवं मूल्यांकन केंद्र (रेक)</h1>
              <h2 className="text-sm font-bold text-gray-700">Recruitment & Assessment Centre (RAC)</h2>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 shadow transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
        <div className="h-1 w-full flex">
          <div className="h-full w-1/3 bg-saffron"></div>
          <div className="h-full w-1/3 bg-white"></div>
          <div className="h-full w-1/3 bg-indiagreen"></div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl w-full space-y-6 px-4 py-8 flex-1">
        
        {!appData ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-300 shadow-md rounded p-8 border-t-4 border-t-drdoblue">
            <h2 className="text-2xl font-bold text-drdoblue mb-6 border-b-2 border-gray-200 pb-2">New Application (SIH1652)</h2>
            <form onSubmit={handleApplicationSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">
                  <p><strong>Note:</strong> Your official Candidate Name will be automatically extracted from your uploaded <code>application_form.pdf</code> using our AI engine.</p>
                </div>
              </div>
              
              <div className="pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Upload Documents (10th, 12th, Degree, Caste, GATE)</label>
                <div className="border-2 border-dashed border-gray-300 p-8 text-center rounded bg-gray-50">
                  <UploadCloud className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm text-gray-600 font-semibold mb-2">Drag and drop document package here</p>
                  <input required type="file" multiple onChange={e => setFiles(e.target.files)} className="text-sm text-gray-500" />
                  {files.length > 0 && (
                    <p className="text-xs text-green-600 font-bold mt-2">{files.length} file(s) selected.</p>
                  )}
                </div>
              </div>

              <button type="submit" disabled={uploading} className="w-full bg-drdoblue text-white font-bold py-3 rounded mt-4 hover:bg-drdolight transition-colors shadow disabled:opacity-70">
                {uploading ? 'Processing Documents...' : 'Submit Application'}
              </button>

              {uploading && ocrProgress && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-drdoblue border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm font-bold text-drdoblue">{ocrProgress}</p>
                  <p className="text-xs text-gray-500 mt-1">Please do not close this window. Machine learning models are extracting text from your documents locally to ensure privacy.</p>
                </div>
              )}
            </form>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="bg-white border border-gray-300 shadow-md rounded p-6 border-t-4 border-t-drdoblue flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Application ID</p>
                <p className="text-2xl font-black text-drdoblue">{appData.id.substring(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-500 uppercase">Candidate</p>
                <p className="text-lg font-bold text-gray-800">{appData.name}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-300 shadow-md rounded p-6">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-6">Application Status Tracking</h3>
              
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
                
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-green-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <CheckCircle size={18} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-gray-50 border border-gray-200 p-4 rounded shadow-sm">
                    <h4 className="font-bold text-gray-800">Application Submitted</h4>
                    <p className="text-xs text-gray-500 mt-1">Your documents and details were received securely.</p>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${appData.status === 'Pending' ? 'bg-saffron text-white animate-pulse' : (appData.status === 'Rejected' ? 'bg-red-500 text-white' : 'bg-green-500 text-white')}`}>
                    {appData.status === 'Pending' ? <Clock size={18} /> : (appData.status === 'Rejected' ? <LogOut size={18} /> : <CheckCircle size={18} />)}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-gray-50 border border-gray-200 p-4 rounded shadow-sm">
                    <h4 className="font-bold text-gray-800">Verification Engine (AI & Admin)</h4>
                    {appData.status === 'Pending' && <p className="text-xs text-saffron font-bold mt-1">Verification Pending...</p>}
                    {appData.status === 'Rejected' && (
                      <div className="mt-1">
                        <p className="text-xs text-red-600 font-bold">Application Rejected.</p>
                        {appData.extractedData?.tamperAlerts?.length > 0 ? (
                          <ul className="list-disc list-inside text-xs text-red-500 mt-1">
                            {appData.extractedData.tamperAlerts.map((alert, i) => <li key={i}>{alert}</li>)}
                          </ul>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">Does not meet required GATE/Eligibility criteria.</p>
                        )}
                      </div>
                    )}
                    {(appData.status === 'Eligible' || appData.status.includes('Resume')) && <p className="text-xs text-green-600 font-bold mt-1">Verified & Eligible! Documents matched successfully.</p>}
                  </div>
                </div>

                {(appData.status === 'Eligible' || appData.status.includes('Resume') || appData.status === 'RoleAssigned') && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${appData.status === 'Eligible' ? 'bg-drdoblue text-white animate-bounce' : 'bg-green-500 text-white'}`}>
                      <FileSearch size={18} />
                    </div>
                    <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded shadow-sm ${appData.status === 'Eligible' ? 'bg-blue-50 border-2 border-drdoblue' : 'bg-gray-50 border border-gray-200'}`}>
                      <h4 className="font-bold text-gray-800">Resume Upload & Role Mapping</h4>
                      
                      {appData.status === 'Eligible' && (
                        <div className="mt-3">
                          <p className="text-xs font-bold text-drdoblue mb-2">Congratulations! Please upload your resume for Final Role Assignment.</p>
                          {!resumeUploading ? (
                            <label className="cursor-pointer block bg-drdoblue text-white text-center py-2 rounded text-sm font-bold shadow hover:bg-drdolight transition-colors">
                              <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeSubmit} />
                              Upload Resume Now
                            </label>
                          ) : (
                            <div className="text-xs font-bold text-drdoblue flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-drdoblue border-t-transparent rounded-full"></div> Uploading...
                            </div>
                          )}
                        </div>
                      )}

                      {appData.status === 'ResumeSubmitted' && (
                        <div className="mt-2 text-saffron">
                          <p className="text-xs font-bold mb-1">Resume Submitted Successfully.</p>
                          <p className="text-sm font-bold">Awaiting Admin AI Analysis & Assignment...</p>
                        </div>
                      )}
                      
                      {appData.status === 'RoleAssigned' && (
                        <div className="mt-2 text-green-700">
                          <p className="text-xs font-bold mb-1">Role Assigned Successfully!</p>
                          <p className="text-sm font-black uppercase border border-green-200 bg-green-100 inline-block px-2 py-1 rounded">Mapped Role: {appData.role}</p>
                        </div>
                      )}
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
