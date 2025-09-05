import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import ForgotPassword from "./../components/ForgotPassword";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      
      console.log("Login successful, clearing form and navigating...");
      setEmail("");
      setPassword("");
      
      // Show success toast
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });

      // Small delay to ensure auth context is updated
      setTimeout(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log("User data after login:", user);
        
        if (user.role === 'admin') {
          console.log("Navigating to admin dashboard...");
          navigate('/dashboard');
        } else if (user.role === 'employee') {
          console.log("Navigating to employee dashboard...");
          navigate('/employee-dashboard');
        } else {
          console.log("Unknown role, navigating to default dashboard...");
          navigate('/dashboard'); // fallback
        }
      }, 100);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: apiError?.response?.data?.message || "Invalid credentials. Please check your email and password.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={cn("flex flex-col gap-4 sm:gap-6 w-full max-w-sm mx-auto px-4 sm:px-0", className)} {...props}>
      <Card className="w-full">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-6">
          <CardTitle className="text-lg sm:text-xl">Welcome back</CardTitle>
         
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:gap-6">
              <div className="grid gap-4 sm:gap-6">
                <div className="grid gap-2 sm:gap-3">
                  <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 sm:h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="grid gap-2 sm:gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowForgot(true);
                      }}
                      className="ml-auto text-xs sm:text-sm underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  {showForgot && (
                    <ForgotPassword />
                  )}
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 sm:h-10 text-sm sm:text-base pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-11 min-w-11 sm:min-h-10 sm:min-w-10 flex items-center justify-center"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 sm:h-10 text-sm sm:text-base" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </div>

              <div className="text-center text-xs sm:text-sm">
                Don&apos;t have an account?{" "}
                <Link to="/" className="text-blue-600 underline">
                  Sign up
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-center text-xs text-balance px-2">
        By clicking continue, you agree to our <a href="#" className="underline">Terms of Service</a>{" "}
        and <a href="#" className="underline">Privacy Policy</a>.
      </div>
    </div>
  );
}
