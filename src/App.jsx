import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import ApplicantDashboard from './pages/ApplicantDashboard'

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<Login/>} />
      <Route path="/admin" element={<AdminDashboard/>} />
      <Route path="/applicant" element={<ApplicantDashboard/>} />
      <Route path="/verify" element={<Dashboard/>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
