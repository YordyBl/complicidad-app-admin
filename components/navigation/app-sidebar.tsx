'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Banknote,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { LogoutButton } from '@/features/auth/logout/logout-button'

const navItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/inventory', label: 'Inventario', icon: Package },
  { href: '/sales', label: 'Ventas', icon: ShoppingCart },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/cash', label: 'Caja', icon: Banknote },
]

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="px-5 py-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary/90 transition-colors">
                <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm tracking-tight">
                  Complicidad
                </h2>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Centro de operaciones
                </p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="flex flex-col justify-between h-[calc(100vh-4rem)]">
            <SidebarGroup>
              <SidebarGroupLabel>Navegación</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                      >
                        <Link href={item.href} className="flex items-center gap-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarFooter className="border-t">
              <div className="px-3 py-2">
                <LogoutButton />
              </div>
            </SidebarFooter>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex h-14 items-center gap-4 border-b px-6">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
