import type { ReactNode } from 'react'
import logo from '@/assets/logo.png'

export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-sm p-8 space-y-6">
        <img src={logo} alt="Inertia" className="w-14 h-14 rounded-xl mx-auto" />
        <h1 className="text-2xl font-semibold tracking-tight text-center">{title}</h1>
        {children}
      </div>
    </div>
  )
}
