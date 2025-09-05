import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { IconLogout } from "@tabler/icons-react"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import MobileDrawer  from "@/components/MobileDrawer"

export function SiteHeader() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-1 px-2 sm:px-4 lg:gap-2 lg:px-6">
        {/* Mobile drawer for small screens */}
        <div className="md:hidden">
          <MobileDrawer user={user} />
        </div>
        
        {/* Desktop sidebar trigger */}
        <div className="hidden md:block">
          <SidebarTrigger className="-ml-1" />
        </div>
        
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 hidden md:block"
        />
        
        <h1 className="text-sm sm:text-base font-medium truncate">
          {user?.role === "admin" ? "Admin Dashboard" : "Employee Dashboard"}
        </h1>
        
        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="ghost" 
            onClick={handleLogout} 
            size="sm" 
            className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
          >
            <IconLogout className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
