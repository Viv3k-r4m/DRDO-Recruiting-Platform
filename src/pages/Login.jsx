import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e){
    e.preventDefault()
    if(email === 'admin@rac.gov.in' && password === 'admin123'){
      navigate('/dashboard')
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white">
      <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{duration:0.6}} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-govblue mb-2">RAC DRDO</h1>
        <p className="text-sm text-gray-600 mb-6">Intelligent Document Verification — Admin Login</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg p-2" placeholder="admin@rac.gov.in" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="mt-1 w-full border border-gray-200 rounded-lg p-2" placeholder="admin123" />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button className="w-full bg-govblue text-white py-2 rounded-lg">Sign in</button>
        </form>
      </motion.div>
      <div className="absolute bottom-6 text-xs text-gray-500">Demo for SIH1652 | All documents are sample/fictitious for project testing only</div>
    </div>
  )
}
