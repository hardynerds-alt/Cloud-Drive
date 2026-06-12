import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cloud, Loader2, Sun, Moon } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { data: auth, isLoading: authLoading } = useGetMe();
  const [, setLocation] = useLocation();
  const login = useLogin();
  const { toast } = useToast();
  const { theme, toggle } = useTheme();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: "",
    },
  });

  useEffect(() => {
    if (!authLoading && auth?.authenticated) {
      setLocation("/");
    }
  }, [auth, authLoading, setLocation]);

  const onSubmit = (data: LoginForm) => {
    login.mutate({ data }, {
      onSuccess: () => {
        setLocation("/");
      },
      onError: (err) => {
        toast({
          title: "Login failed",
          description: err.error?.error || "Incorrect password",
          variant: "destructive",
        });
      }
    });
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
      >
        {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </Button>
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Cloud className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Vault Storage</CardTitle>
          <CardDescription>Enter your master password to access your personal cloud</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-md" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                Access Vault
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
