import { Link } from "wouter";
import { HardDrive, Cloud, PieChart, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background text-foreground">
      <aside className="w-full lg:w-64 flex-shrink-0 border-b lg:border-r border-border bg-card flex flex-col justify-between">
        <div className="p-4 lg:p-6 flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-3 font-semibold text-lg text-primary">
            <Cloud className="w-6 h-6" />
            <span>Server</span>
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
            onClick={toggle}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
