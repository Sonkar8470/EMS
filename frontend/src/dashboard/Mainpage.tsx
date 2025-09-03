import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export default function Page() {
  const { user } = useAuth();

  // Transform user to match AppSidebar expectations
  const transformedUser = user ? {
    ...user,
    id: user._id || user.employeeId || "",
    mobile: user.mobile || ""
  } : null;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={transformedUser} />
      <SidebarInset>
        <SiteHeader />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}