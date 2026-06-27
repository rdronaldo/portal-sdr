'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Users, Kanban, LogOut, Menu, X } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/kanban', label: 'Kanban', icon: Kanban },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initial = userEmail.charAt(0).toUpperCase()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <h1 className="text-base font-bold text-white leading-tight">Portal SDR</h1>
        <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
          Leads qualificados por IA
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: '#028090', color: '#FFFFFF' }
                  : { color: '#94A3B8' }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.color = '#FFFFFF'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#94A3B8'
                }
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: '#028090' }}
          >
            {initial}
          </div>
          <p className="text-xs truncate flex-1" style={{ color: '#94A3B8' }}>
            {userEmail}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: '#94A3B8' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = '#FFFFFF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#94A3B8'
          }}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-60 flex-col h-full"
        style={{ backgroundColor: '#0A1628', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg shadow-md"
          style={{ backgroundColor: '#0A1628' }}
          aria-label="Abrir menu"
        >
          <Menu size={20} className="text-white" />
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setOpen(false)}
            />
            <aside
              className="fixed left-0 top-0 h-full w-60 z-50 shadow-2xl"
              style={{ backgroundColor: '#0A1628' }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-1"
                style={{ color: '#94A3B8' }}
                aria-label="Fechar menu"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </aside>
          </>
        )}
      </div>
    </>
  )
}
