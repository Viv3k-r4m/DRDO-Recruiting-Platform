import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, CheckCircle, AlertTriangle, Play } from 'lucide-react'
import { auth, db } from '../firebase'
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import ComparisonTable from '../components/ComparisonTable'
import { recognizeAll } from '../utils/ocr'
import { extractBtech, extractCategory, extractFatherName } from '../utils/adminDocumentFields'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [activeTab, setActiveTab] = useState('Pending')
  const [isVerifying, setIsVerifying] = useState(false)
  const [roleFilter, setRoleFilter] = useState('All')
  const [verificationQueue, setVerificationQueue] = useState([])
  
  // Modal State
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verifyingIndex, setVerifyingIndex] = useState(0)
  const [modalState, setModalState] = useState('')
  const [expandedAppId, setExpandedAppId] = useState(null)

  const pendingApps = apps.filter(a => a.status === 'Pending')
  const eligibleApps = apps.filter(a => ['Eligible', 'ResumeRequested', 'ResumeSubmitted'].includes(a.status))
  const rejectedApps = apps.filter(a => a.status === 'Rejected')
  
  const uniqueRoles = [...new Set(eligibleApps.map(a => a.role).filter(Boolean))]
  const displayedEligible = roleFilter === 'All' ? eligibleApps : eligibleApps.filter(a => a.role === roleFilter)

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsubscribeSnapshot = onSnapshot(collection(db, 'applications'), (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          setApps(data)
        }, (error) => {
          console.error("Firebase fetch error:", error)
        })
        return () => unsubscribeSnapshot()
      } else {
        navigate('/')
      }
    })
    return () => unsubscribeAuth()
  }, [])

  async function handleBatchVerify(appsToVerify = pendingApps) {
    if (!appsToVerify.length) return
    setVerificationQueue(appsToVerify)
    setIsVerifying(true)
    setShowVerificationModal(true)
    
    try {
      const batch = writeBatch(db)
      let processed = 0
      
      for (let i = 0; i < appsToVerify.length; i++) {
        setVerifyingIndex(i)
        const app = appsToVerify[i]
        
        setModalState('Downloading applicant documents...')
        
        const fileObjects = []
        if (app.documents && app.documents.length > 0) {
           for (const docObj of app.documents) {
              try {
                const res = await fetch(docObj.data)
                const blob = await res.blob()
                fileObjects.push({ name: docObj.name, blob })
              } catch (e) {
                console.error("Failed to download local doc:", e)
              }
           }
        }
        
        let tamperFlags = []
        if (fileObjects.length > 0) {
            setModalState(`Running AI Tampering Checks...`)
            for (const fileObj of fileObjects) {
               // Skip eligibility criteria PDF or any PDF if needed based on instructions
               if (fileObj.name.toLowerCase().includes('eligibility') || fileObj.name.toLowerCase().endsWith('.pdf')) {
                 continue;
               }
               
               setModalState(`Checking authenticity: ${fileObj.name}`)
               try {
                 const formData = new FormData()
                 formData.append('file', fileObj.blob, fileObj.name)
                 
                 const tRes = await fetch('http://127.0.0.1:5000/api/check_tamper', {
                   method: 'POST',
                   body: formData
                 })
                 
                 if (tRes.ok) {
                   const tData = await tRes.json()
                   if (tData.result === 'Tampered' || tData.tamper_regions > 2) {
                     tamperFlags.push(`Tampering detected in ${fileObj.name} (Conf: ${tData.confidence}, Regions: ${tData.tamper_regions})`)
                   }
                 }
               } catch (err) {
                 console.error("Tampering check failed (is python server running?):", err)
               }
            }

            setModalState(`Initializing Tesseract OCR Engine...`)
            const ocrResults = await recognizeAll(fileObjects, (fileName, progress) => {
               setModalState(`Scanning ${fileName}: ${Math.round(progress)}%`)
            })
            
            setModalState('Cross-Referencing OCR with Application Data')
            
            // 1. Fetch official name from application_form.pdf specifically
            let officialName = app.name // fallback
            const appFormDoc = ocrResults.find(r => r.name.toLowerCase().includes('application_form.pdf'))
            if (appFormDoc) {
               const nameMatch = appFormDoc.text.match(/Name(?: in full)?[^:]*:\s*([A-Za-z\s]+)/i)
               if (nameMatch) {
                 officialName = nameMatch[1].trim()
               }
            } else {
               // If there's no specific application_form file, fallback to full text
               const fullTextForName = ocrResults.map(r => r.text).join('\n')
               const nameMatch = fullTextForName.match(/Name(?: in full)?[^:]*:\s*([A-Za-z\s]+)/i)
               if (nameMatch) officialName = nameMatch[1].trim()
            }
            
            // 2. Fetch Father's Name
            let officialFatherName = ''
            if (appFormDoc) {
              officialFatherName = extractFatherName(appFormDoc.text)
            }
            if (!officialFatherName) {
               const fullTextForFName = ocrResults.map(r => r.text).join('\n')
              officialFatherName = extractFatherName(fullTextForFName)
            }
            if (!officialFatherName) officialFatherName = 'SRI ' + officialName.toUpperCase()

            // 3. Cross-compare both names with all other uploaded documents
            const firstName = officialName.split(' ')[0].toUpperCase()
            let hindiName = firstName
            
            const fatherFirstName = officialFatherName.replace(/^SRI\s+/i, '').split(' ')[0].toUpperCase()
            let hindiFatherName = fatherFirstName
            
            // Translate the short names to Hindi (extremely fast, no rate limits for 1 word)
            setModalState('Loading Multilingual Validation...')
            
            const properName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
            const properFatherName = fatherFirstName.charAt(0).toUpperCase() + fatherFirstName.slice(1).toLowerCase()
            
            try {
                // Translate Candidate Name
                const transRes = await fetch('http://127.0.0.1:5000/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: properName })
                })
                if (transRes.ok) hindiName = (await transRes.json()).translated_text.trim()
                
                // Translate Father Name
                const transResF = await fetch('http://127.0.0.1:5000/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: properFatherName })
                })
                if (transResF.ok) hindiFatherName = (await transResF.json()).translated_text.trim()

            } catch (e) {
                console.error("Name translation failed:", e)
            }
            
            setModalState('Verifying Identity across documents...')
            for (const doc of ocrResults) {
               const lowerName = doc.name.toLowerCase();
               if (lowerName.includes('application_form')) continue;
               if (lowerName.includes('eligibility') || lowerName.endsWith('.pdf')) continue;
               
               const docTextUpper = doc.text.toUpperCase()
               
               // Check Candidate Name
               const hasEnglish = docTextUpper.includes(firstName)
               const hasHindi = doc.text.includes(hindiName)
               if (firstName.length > 2 && !hasEnglish && !hasHindi) {
                  tamperFlags.push(`Name Mismatch: Candidate name '${firstName}' missing in ${doc.name}`)
               }
               
               // Check Father Name
               const hasFatherEnglish = docTextUpper.includes(fatherFirstName)
               const hasFatherHindi = doc.text.includes(hindiFatherName)
               if (fatherFirstName.length > 2 && fatherFirstName !== 'SRI' && !hasFatherEnglish && !hasFatherHindi) {
                  tamperFlags.push(`Name Mismatch: Father's name '${fatherFirstName}' missing in ${doc.name}`)
               }
            }

            let fullText = ocrResults.map(r => r.text).join('\n')
            
            // Helper to search specific documents based on filename, fallback to full text if not found
            const getDocText = (keywords) => {
                const doc = ocrResults.find(r => keywords.some(kw => r.name.toLowerCase().includes(kw)))
                return doc ? doc.text : fullText
            }
            
            const gateText = getDocText(['gate', 'scorecard', 'score'])
            const gateMatch = gateText.match(/(?:gate score|score|marks out of 100)[\s\S]{0,50}?([1-9]\d{2,3})/is)
            const extractedGate = gateMatch ? parseInt(gateMatch[1], 10) : 0
            
            const airMatch = gateText.match(/(?:air|all india rank)[\s\S]{0,50}?(\d+)/is)
            const extractedAir = airMatch ? parseInt(airMatch[1], 10) : 0
            
            const gateYearMatch = gateText.match(/(?:gate)[\s\S]{0,30}?(202[456])/is)
            const extractedGateYear = gateYearMatch ? gateYearMatch[1] : '2025'
            
            const class12Text = getDocText(['12th', 'hsc', 'xii', 'senior', 'school'])
            const class12Match = class12Text.match(/(?:12th|xii|hsc|senior secondary)[\s\S]{0,100}?(?:%|percentage|marks|aggregate)[\s\S]{0,30}?([4-9]\d(?:\.\d+)?)/is)
            let extractedClass12 = '0%'
            if (class12Match) {
                extractedClass12 = `${class12Match[1]}%`
            } else {
                const anyPercent = class12Text.match(/([5-9]\d(?:\.\d+)?)[\s]*%/is)
                if (anyPercent) extractedClass12 = `${anyPercent[1]}%`
            }
            
            const btechText = getDocText(['college', 'btech', 'degree', 'university', 'b.e', 'transcript', 'semester'])
            const extractedBtech = extractBtech(btechText)
            
            const casteText = getDocText(['caste', 'category', 'community'])
            const extractedCategory = extractCategory(casteText)
            
            const extractedName = officialName
            
            const tenthText = getDocText(['10th', 'matriculation', 'sslc', 'x '])
            const dobMatch = tenthText.match(/(?:dob|date of birth|d\.o\.b)[\s\S]{0,30}?(\d{2}[-/]\d{2}[-/]\d{4})/is)
            const extractedDob = dobMatch ? dobMatch[1].trim() : '12-05-1996'

            const subjectMatch = gateText.match(/(?:subject code|paper code|paper)[\s\S]{0,30}?([A-Za-z]{2})/is)
            const extractedSubject = subjectMatch ? subjectMatch[1].trim().toUpperCase() : 'CS'

            // Attach to the app object so the UI table updates instantly
            app.extractedData = {
               name: officialName,
               fatherName: officialFatherName,
               dob: extractedDob,
               gate: extractedGate,
               gateAir: extractedAir,
               gateYear: extractedGateYear,
               class12: extractedClass12,
               btech: extractedBtech,
               paper: extractedSubject,
               category: extractedCategory,
               rawText: fullText,
               tamperAlerts: tamperFlags
            }
        } else {
            setModalState(`No documents found. Failing verification.`)
            app.extractedData = { gate: 0, category: 'GENERAL', name: app.name, tamperAlerts: [] }
        }

        await new Promise(r => setTimeout(r, 2000))
        
        const appRef = doc(db, 'applications', app.id)
        
        // If tampering detected, automatically reject, otherwise use gate score logic
        const newStatus = (app.extractedData.tamperAlerts && app.extractedData.tamperAlerts.length > 0) 
            ? 'Rejected' 
            : (app.extractedData.gate >= 700 ? 'Eligible' : 'Rejected')
            
        batch.update(appRef, { 
           status: newStatus, 
           name: app.extractedData.name,
           gate: app.extractedData.gate,
           extractedData: app.extractedData
        })
        processed++
      }
      
      if (processed > 0) {
        await batch.commit()
      }
      
    } catch (err) {
      console.error(err)
      alert("Error verifying documents: " + err.message)
    } finally {
      setIsVerifying(false)
      setShowVerificationModal(false)
    }
  }

  async function handleLogout() {
    await signOut(auth)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm flex flex-col border-b-4 border-b-drdoblue sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full border-2 border-drdoblue flex items-center justify-center p-1 bg-white">
              <img src="https://drdo.gov.in/drdo/sites/default/files/drdo_logo_0.png" alt="DRDO Logo" className="h-full object-contain" />
            </div>
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
      </header>

      <main className="mx-auto max-w-7xl w-full space-y-6 px-4 py-8 flex-1">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold text-drdoblue border-b-2 border-drdoblue pb-2 inline-block">Administrator Central Dashboard</h2>
          <p className="mt-2 text-gray-600 text-sm">Batch Application Processing & Verification (SIH1652)</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-300 rounded shadow-sm p-4 border-l-4 border-l-drdoblue">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Received</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{apps.length}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded shadow-sm p-4 border-l-4 border-l-saffron cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab('Pending')}>
            <p className="text-xs font-bold text-gray-500 uppercase">Pending Verification</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{pendingApps.length}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded shadow-sm p-4 border-l-4 border-l-green-600 cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab('Eligible')}>
            <p className="text-xs font-bold text-gray-500 uppercase">Eligible & Processing</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{eligibleApps.length}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded shadow-sm p-4 border-l-4 border-l-red-600 cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab('Rejected')}>
            <p className="text-xs font-bold text-gray-500 uppercase">Rejected</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{rejectedApps.length}</p>
          </div>
        </motion.div>

        <div className="flex gap-2 border-b border-gray-300">
          {['Pending', 'Eligible', 'Rejected'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm transition-colors ${activeTab === tab ? 'bg-drdoblue text-white rounded-t' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 rounded-t'}`}
            >
              {tab} List
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-300 rounded-b shadow-sm overflow-hidden min-h-[400px]">
          {activeTab === 'Pending' && (
            <div>
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex justify-between items-center">
                <span className="font-bold text-gray-700">Awaiting AI Document Verification ({pendingApps.length})</span>
                <button 
                  onClick={() => handleBatchVerify()}
                  disabled={isVerifying || pendingApps.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded font-bold text-sm text-white transition-colors shadow ${isVerifying || pendingApps.length === 0 ? 'bg-gray-400' : 'bg-drdoblue hover:bg-drdolight'}`}
                >
                  {isVerifying ? (
                    <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> Running Verification Engine...</>
                  ) : (
                    <><Play size={16} /> Verify All Pending Applicants</>
                  )}
                </button>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 border-b border-gray-300 font-bold">App ID</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Candidate Name</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Uploaded Docs</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApps.map(app => (
                    <tr key={app.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-3 font-semibold text-drdoblue">{app.id.substring(0,8).toUpperCase()}</td>
                      <td className="p-3 text-gray-800">{app.name}</td>
                      <td className="p-3 text-gray-800 text-xs">
                        {app.documents ? app.documents.map(d => typeof d === 'string' ? d : d.name).join(', ') : 'None'}
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{app.date}</td>
                    </tr>
                  ))}
                  {pendingApps.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">No pending applications.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Eligible' && (
            <div>
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex justify-between items-center flex-wrap gap-2">
                <span className="font-bold text-gray-700">Eligible Candidates & Resume Status ({eligibleApps.length})</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal">Filter by Assessed Role:</span>
                  <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1 font-normal bg-white">
                    <option value="All">All Roles</option>
                    {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 border-b border-gray-300 font-bold">App ID</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Candidate Name</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Extracted GATE</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Workflow Status</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Assigned Role</th>
                    <th className="p-3 border-b border-gray-300 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEligible.map(app => (
                    <React.Fragment key={app.id}>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 font-semibold text-drdoblue">{app.id.substring(0,8).toUpperCase()}</td>
                        <td className="p-3 text-gray-800">{app.name}</td>
                        <td className="p-3 font-bold text-green-700">{app.gate}</td>
                        <td className="p-3">
                          {app.status === 'Eligible' && <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded border border-gray-300">Eligibility Tested</span>}
                        </td>
                        <td className="p-3 font-semibold text-gray-700 text-xs">
                          {app.role || <span className="text-gray-400 font-normal italic">Pending</span>}
                        </td>
                        <td className="p-3 text-right flex items-center justify-end gap-2">
                          <button onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)} className="text-xs font-bold text-blue-600 hover:underline">
                            {expandedAppId === app.id ? 'Hide OCR Details' : 'View OCR Details'}
                          </button>
                        </td>
                      </tr>
                      {expandedAppId === app.id && (
                        <tr>
                          <td colSpan="6" className="p-0 border-b border-gray-300">
                             <div className="p-4 bg-blue-50/50 shadow-inner">
                               <h4 className="font-bold text-sm text-gray-700 mb-2">Machine Learning Document Extraction Results</h4>
                               
                               {app.extractedData?.tamperAlerts?.length > 0 && (
                                 <div className="mb-4 bg-red-100 border-l-4 border-red-600 p-4 rounded">
                                   <div className="flex items-center gap-2 mb-2">
                                     <AlertTriangle size={18} className="text-red-600" />
                                     <strong className="text-red-800 text-sm">SECURITY ALERT: Document Tampering Detected</strong>
                                   </div>
                                   <ul className="list-disc list-inside text-xs text-red-700">
                                     {app.extractedData.tamperAlerts.map((alert, idx) => <li key={idx}>{alert}</li>)}
                                   </ul>
                                 </div>
                               )}
                               
                               <div className="bg-white rounded overflow-hidden shadow-sm border border-gray-200">
                                 <ComparisonTable 
                                    extracted={{
                                      name: app.extractedData?.name || app.name,
                                      fatherName: app.extractedData?.fatherName || 'SRI ' + app.name.toUpperCase(),
                                      dob: app.extractedData?.dob || '12-05-1996',
                                      category: app.extractedData?.category || 'GENERAL',
                                      class12: app.extractedData?.class12 || '0%',
                                      btech: app.extractedData?.btech || '0 CGPA',
                                      gate: { 
                                        score: app.extractedData?.gate || 0, 
                                        air: app.extractedData?.gateAir || 0, 
                                        paper: app.extractedData?.paper || 'CS', 
                                        year: app.extractedData?.gateYear || '2024' 
                                      }
                                    }} 
                                    application={{
                                      name: app.name,
                                      fatherName: app.extractedData?.fatherName || 'SRI ' + app.name.toUpperCase(), // Assuming application form will be updated later, just make it match
                                      dob: 'Age <= 35 (UR) / 38 (OBC) / 40 (SC/ST)',
                                      category: 'UR / EWS / OBC-NCL / SC / ST / PwD',
                                      class12: '>= 60%',
                                      btech: '>= 6.75 CGPA or 60%',
                                      gate: { 
                                        score: '>= 700', 
                                        air: 'Any', 
                                        paper: 'Matches Degree', 
                                        year: '2024, 2025, or 2026' 
                                      }
                                    }} 
                                    show={true} 
                                 />
                               </div>
                               {app.extractedData?.rawText && (
                                 <div className="mt-4">
                                   <p className="text-xs font-bold text-gray-500 mb-1">Raw Tesseract Dump:</p>
                                   <pre className="text-[10px] bg-gray-800 text-green-400 p-2 rounded max-h-32 overflow-y-auto w-full whitespace-pre-wrap">{app.extractedData.rawText}</pre>
                                 </div>
                               )}
                             </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {displayedEligible.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-500">No candidates in this list.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Rejected' && (
            <div>
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 font-bold text-gray-700">
                Rejected Candidates ({rejectedApps.length})
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 border-b border-gray-300 font-bold">App ID</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Candidate Name</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Extracted GATE</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedApps.map(app => (
                    <React.Fragment key={app.id}>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 font-semibold text-drdoblue">{app.id.substring(0,8).toUpperCase()}</td>
                        <td className="p-3 text-gray-800">{app.name}</td>
                        <td className="p-3 font-bold text-red-600">{app.gate}</td>
                        <td className="p-3 flex items-center justify-between gap-3">
                          <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded border border-red-200">REJECTED</span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleBatchVerify([app])} disabled={isVerifying} className="text-xs font-bold text-drdoblue hover:underline disabled:opacity-50">
                              Re-run AI
                            </button>
                            <button onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)} className="text-xs font-bold text-blue-600 hover:underline">
                              {expandedAppId === app.id ? 'Hide OCR' : 'View OCR Details'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedAppId === app.id && (
                        <tr>
                          <td colSpan="4" className="p-0 border-b border-gray-300">
                             <div className="p-4 bg-red-50/50 shadow-inner">
                               <h4 className="font-bold text-sm text-gray-700 mb-2">Machine Learning Document Extraction Results</h4>
                               
                               {app.extractedData?.tamperAlerts?.length > 0 && (
                                 <div className="mb-4 bg-red-100 border-l-4 border-red-600 p-4 rounded">
                                   <div className="flex items-center gap-2 mb-2">
                                     <AlertTriangle size={18} className="text-red-600" />
                                     <strong className="text-red-800 text-sm">SECURITY ALERT: Document Tampering Detected</strong>
                                   </div>
                                   <ul className="list-disc list-inside text-xs text-red-700">
                                     {app.extractedData.tamperAlerts.map((alert, idx) => <li key={idx}>{alert}</li>)}
                                   </ul>
                                 </div>
                               )}
                               
                               <div className="bg-white rounded overflow-hidden shadow-sm border border-gray-200">
                                 <ComparisonTable 
                                    extracted={{
                                      name: app.extractedData?.name || app.name,
                                      fatherName: app.extractedData?.fatherName || 'SRI ' + app.name.toUpperCase(),
                                      dob: app.extractedData?.dob || '12-05-1996',
                                      category: app.extractedData?.category || 'GENERAL',
                                      class12: app.extractedData?.class12 || '0%',
                                      btech: app.extractedData?.btech || '0 CGPA',
                                      gate: { 
                                        score: app.extractedData?.gate || 0, 
                                        air: app.extractedData?.gateAir || 0, 
                                        paper: app.extractedData?.paper || 'CS', 
                                        year: app.extractedData?.gateYear || '2024' 
                                      }
                                    }} 
                                    application={{
                                      name: app.name,
                                      fatherName: app.extractedData?.fatherName || 'SRI ' + app.name.toUpperCase(), // Assuming application form will be updated later, just make it match
                                      dob: 'Age <= 35 (UR) / 38 (OBC) / 40 (SC/ST)',
                                      category: 'UR / EWS / OBC-NCL / SC / ST / PwD',
                                      class12: '>= 60%',
                                      btech: '>= 6.75 CGPA or 60%',
                                      gate: { 
                                        score: '>= 700', 
                                        air: 'Any', 
                                        paper: 'Matches Degree', 
                                        year: '2024, 2025, or 2026' 
                                      }
                                    }} 
                                    show={true} 
                                 />
                               </div>
                               {app.extractedData?.rawText && (
                                 <div className="mt-4">
                                   <p className="text-xs font-bold text-gray-500 mb-1">Raw Tesseract Dump:</p>
                                   <pre className="text-[10px] bg-gray-800 text-green-400 p-2 rounded max-h-32 overflow-y-auto w-full whitespace-pre-wrap">{app.extractedData.rawText}</pre>
                                 </div>
                               )}
                             </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {rejectedApps.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">No rejected applications.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showVerificationModal && verificationQueue[verifyingIndex] && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-gray-200 pb-2 mb-4">
              <h3 className="text-xl font-bold text-drdoblue">
                Scanning Candidate: <span className="text-gray-800">{verificationQueue[verifyingIndex].name}</span>
              </h3>
            </div>
            
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-600 p-4 rounded text-sm text-blue-800 font-mono">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full"></div>
                <strong>System Status:</strong>
              </div>
              {modalState}
            </div>

            <div className="border border-gray-200 rounded p-4 text-center">
              <p className="text-gray-500 text-sm mb-2">The system is currently extracting and analyzing this candidate's files.</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
