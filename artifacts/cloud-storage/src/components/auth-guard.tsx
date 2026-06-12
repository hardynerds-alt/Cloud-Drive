import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: auth, isLoading } = useGetMe();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && auth && !auth.authenticated) {
      setLocation("/login");
    }
  }, [auth, isLoading, setLocation]);

  if (isLoading || !auth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!auth.authenticated) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
