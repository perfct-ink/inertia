import type { ReactNode } from 'react'
import './AuthLayout.scss'
import logo from '@/assets/logo.png'

export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="view-auth">
      <div className="auth-card">
        <img src={logo} alt="Inertia" className="auth-logo" />
        <h1 className="auth-title">{title}</h1>
        {children}
      </div>
    </div>
  )
}
