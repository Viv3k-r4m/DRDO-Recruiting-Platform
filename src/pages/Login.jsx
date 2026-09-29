import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Key, AlertCircle, Users, Mail, Lock, UserPlus, LogIn } from 'lucide-react'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

export default function Login() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      if (isAdmin) {
        if (email === 'admin@rac.gov.in' && password === 'admin123') {
          // Actually log the admin into Firebase so Firestore rules don't block them
          try {
            await signInWithEmailAndPassword(auth, email, password)
          } catch (loginErr) {
            // If the sign-in failed, let's try to create the account just in case it doesn't exist
            try {
               await createUserWithEmailAndPassword(auth, email, password)
            } catch (createErr) {
               console.error("Login Error:", loginErr);
               console.error("Create Error:", createErr);
               throw new Error(`Admin Auth Failed: ${loginErr.code} / ${createErr.code}. Please ensure Email/Password Auth is enabled in Firebase Console.`)
            }
          }
          localStorage.setItem('admin_session', 'true')
          navigate('/admin')
        } else {
          throw new Error('Invalid Admin Credentials (Use admin@rac.gov.in / admin123)')
        }
      } else {
        // Applicant Login / Signup
        if (isLogin) {
          await signInWithEmailAndPassword(auth, email, password)
          navigate('/applicant')
        } else {
          await createUserWithEmailAndPassword(auth, email, password)
          navigate('/applicant')
        }
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Authentication failed. Make sure Firebase Config is added in src/firebase.js')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <div className="bg-navy text-white py-1 px-4 text-xs flex justify-between items-center z-10 relative">
        <div className="flex gap-4">
          <span>भारत सरकार | GOVERNMENT OF INDIA</span>
          <span className="hidden md:inline">रक्षा मंत्रालय | MINISTRY OF DEFENCE</span>
        </div>
      </div>

      <motion.header initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white shadow-md relative z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Satyameva Jayate" className="h-16" />
            <div className="border-l-2 border-gray-300 h-12 mx-2"></div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-drdoblue leading-tight">भर्ती एवं मूल्यांकन केंद्र (रेक)</h1>
              <h2 className="text-sm md:text-md font-bold text-gray-700">Recruitment & Assessment Centre (RAC)</h2>
              <p className="text-xs text-gray-500 font-semibold">रक्षा अनुसंधान एवं विकास संगठन | DRDO</p>
            </div>
          </div>
          <div className="hidden md:block">
             <Shield className="text-drdoblue h-14 w-14" />
          </div>
        </div>
        <div className="h-1 w-full flex"><div className="h-full w-1/3 bg-saffron"></div><div className="h-full w-1/3 bg-white"></div><div className="h-full w-1/3 bg-indiagreen"></div></div>
      </motion.header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border-t-4 border-t-drdoblue">
          
          <div className="flex border-b border-gray-200">
            <button onClick={() => setIsAdmin(false)} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${!isAdmin ? 'bg-drdoblue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Users size={16} /> Applicant Portal
            </button>
            <button onClick={() => setIsAdmin(true)} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${isAdmin ? 'bg-saffron text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Shield size={16} /> Admin Portal
            </button>
          </div>

          <div className="p-8">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-gray-800">
                {isAdmin ? 'Administrator Login' : (isLogin ? 'Applicant Login' : 'Create Applicant Account')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isAdmin ? 'Access the verification dashboard' : 'Submit and track your application'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:border-drdoblue focus:ring-1 focus:ring-drdoblue outline-none" placeholder="Enter your email" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:border-drdoblue focus:ring-1 focus:ring-drdoblue outline-none" placeholder="Enter your password" required />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button disabled={isLoading} type="submit" className={`w-full text-white font-bold py-3 rounded shadow transition-colors flex items-center justify-center gap-2 ${isAdmin ? 'bg-saffron hover:bg-orange-500' : 'bg-drdoblue hover:bg-drdolight'} disabled:opacity-70`}>
                {isLoading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : (isLogin || isAdmin ? <LogIn size={18} /> : <UserPlus size={18} />)}
                {isLoading ? 'Processing...' : (isLogin || isAdmin ? 'Secure Login' : 'Register Account')}
              </button>
            </form>
            
            {!isAdmin && (
              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button type="button" onClick={() => { setIsLogin(!isLogin); setError('') }} className="text-drdoblue font-bold hover:underline">
                  {isLogin ? 'Sign up here' : 'Log in instead'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </main>
      
      <footer className="bg-gray-800 text-white text-center py-4 text-xs mt-auto">
        <p>© Copyright {new Date().getFullYear()} RAC DRDO, Ministry of Defence. Demo Mode.</p>
      </footer>
    </div>
  )
}
