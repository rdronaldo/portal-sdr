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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#E2E8F0]">
        <h1 className="text-lg font-bold text-[#0A1628]">Portal SDR</h1>
        <p className="text-xs text-[#64748B] mt-0.5">Leads qualificados por IA</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#028090] text-white'
                  : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0A1628]'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-[#028090] flex items-center justify-center text-white text-xs font-bold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs text-[#64748B] truncate flex-1">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#EF4444] transition-colors"
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
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-[#E2E8F0] h-full">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow border border-[#E2E8F0]"
        >
          <Menu size={20} />
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setOpen(false)}
            />
            <aside className="fixed left-0 top-0 h-full w-60 bg-white z-50 shadow-xl">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-1 text-[#64748B]"
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