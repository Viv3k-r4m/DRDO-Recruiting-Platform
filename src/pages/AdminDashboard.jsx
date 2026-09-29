import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, FileSearch, Users, CheckCircle, AlertTriangle, FileText, ChevronRight, Play } from 'lucide-react'
import { auth, db } from '../firebase'
import { collection, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { signOut } from 'firebase/auth'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [activeTab, setActiveTab] = useState('Pending')
  const [isVerifying, setIsVerifying] = useState(false)
  const [roleFilter, setRoleFilter] = useState('All')

  useEffect(() => {
    // Wait for Firebase to restore the auth session before fetching
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsubscribeSnapshot = onSnapshot(collection(db, 'applications'), (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          setApps(data)
        }, (error) => {
          console.error("Firebase fetch error:", error)
        })
        
        // Cleanup snapshot listener if auth changes
        return () => unsubscribeSnapshot()
      } else {
        navigate('/')
      }
    })

    return () => unsubscribeAuth()
  }, [])

  async function handleBatchVerify() {
    setIsVerifying(true)
    try {
      const batch = writeBatch(db)
      let processed = 0
      
      apps.forEach(app => {
        if (app.status === 'Pending') {
          const appRef = doc(db, 'applications', app.id)
          const newStatus = app.gate >= 700 ? 'Eligible' : 'Rejected'
          batch.update(appRef, { status: newStatus })
          processed++
        }
      })
      
      if (processed > 0) {
        await batch.commit()
      }
      setActiveTab('Eligible')
    } catch (err) {
      console.error('Error in batch verify', err)
      alert('Batch verify failed.')
    } finally {
      setIsVerifying(false)
    }
  }

  async function requestResume(id) {
    try {
      const appRef = doc(db, 'applications', id)
      await updateDoc(appRef, { status: 'ResumeRequested' })
    } catch (err) {
      console.error('Error requesting resume:', err)
    }
  }

  async function handleLogout() {
    localStorage.removeItem('admin_session')
    if (auth.currentUser) await signOut(auth)
    navigate('/')
  }

  const pendingApps = apps.filter(a => a.status === 'Pending')
  const eligibleApps = apps.filter(a => ['Eligible', 'ResumeRequested', 'ResumeSubmitted'].includes(a.status))
  const rejectedApps = apps.filter(a => a.status === 'Rejected')

  const uniqueRoles = [...new Set(eligibleApps.map(l => l.role).filter(Boolean))]
  const displayedEligible = roleFilter === 'All' ? eligibleApps : eligibleApps.filter(a => a.role === roleFilter)

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      <div className="bg-navy text-white py-1 px-4 text-xs flex justify-between items-center z-10 relative">
        <div className="flex gap-4">
          <span>भारत सरकार | GOVERNMENT OF INDIA</span>
          <span className="hidden md:inline">रक्षा मंत्रालय | MINISTRY OF DEFENCE</span>
        </div>
        <div className="flex gap-4 text-gray-300">
          <span className="font-bold text-white">ADMIN: admin@rac.gov.in</span>
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
                  onClick={handleBatchVerify}
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
                    <th className="p-3 border-b border-gray-300 font-bold">Declared GATE</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApps.map(app => (
                    <tr key={app.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-3 font-semibold text-drdoblue">{app.id.substring(0,8).toUpperCase()}</td>
                      <td className="p-3 text-gray-800">{app.name}</td>
                      <td className="p-3 text-gray-800">{app.gate}</td>
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
                    <th className="p-3 border-b border-gray-300 font-bold">Workflow Status</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Assigned Role</th>
                    <th className="p-3 border-b border-gray-300 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEligible.map(app => (
                    <tr key={app.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-3 font-semibold text-drdoblue">{app.id.substring(0,8).toUpperCase()}</td>
                      <td className="p-3 text-gray-800">{app.name}</td>
                      <td className="p-3">
                        {app.status === 'Eligible' && <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded border border-gray-300">Eligibility Tested</span>}
                        {app.status === 'ResumeRequested' && <span className="bg-saffron text-white text-xs font-bold px-2 py-1 rounded">Awaiting Resume</span>}
                        {app.status === 'ResumeSubmitted' && <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded border border-green-300">Resume Parsed</span>}
                      </td>
                      <td className="p-3 font-semibold text-gray-700 text-xs">
                        {app.role || <span className="text-gray-400 font-normal italic">Pending</span>}
                      </td>
                      <td className="p-3 text-right">
                        {app.status === 'Eligible' && (
                          <button onClick={() => requestResume(app.id)} className="bg-drdoblue text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-drdolight shadow transition-colors">
                            Request Resume
                          </button>
                        )}
                        {app.status === 'ResumeRequested' && (
                          <span className="text-xs text-gray-500 italic">Waiting on candidate...</span>
                        )}
                        {app.status === 'ResumeSubmitted' && (
                          <span className="text-xs text-green-600 font-bold">Tracker Synced ✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedEligible.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-500">No candidates in this list.</td></tr>}
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
                    <th className="p-3 border-b border-gray-300 font-bold">GATE Score</th>
                    <th className="p-3 border-b border-gray-300 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedApps.map(app => (
                    <tr key={app.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-3 font-semibold text-drdoblue">{app.id.substring(0,8).toUpperCase()}</td>
                      <td className="p-3 text-gray-800">{app.name}</td>
                      <td className="p-3 text-gray-800">{app.gate}</td>
                      <td className="p-3">
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded border border-red-200">REJECTED</span>
                      </td>
                    </tr>
                  ))}
                  {rejectedApps.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">No rejected applications.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </main>
      
      <footer className="bg-gray-800 text-white text-center py-4 text-xs mt-auto">
        <p>© Copyright {new Date().getFullYear()} RAC DRDO, Ministry of Defence, Govt. of India. All Rights Reserved.</p>
      </footer>
    </div>
  )
}
