import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { HardDrive, LogOut, Cloud, PieChart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: auth } = useGetMe();
  const logout = useLogout();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login");
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background text-foreground">
      <aside className="w-full lg:w-64 flex-shrink-0 border-b lg:border-r border-border bg-card flex flex-col justify-between">
        <div className="p-4 lg:p-6 flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-3 font-semibold text-lg text-primary">
            <Cloud className="w-6 h-6" />
            <span>Vault</span>
          </Link>
          
          <nav className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors">
              <HardDrive className="w-4 h-4" />
              Files
            </Link>
            <Link href="/stats" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors">
              <PieChart className="w-4 h-4" />
              Storage Stats
            </Link>
          </nav>
        </div>
        
        <div className="p-4 lg:p-6 border-t border-border mt-auto">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground" 
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            {logout.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
