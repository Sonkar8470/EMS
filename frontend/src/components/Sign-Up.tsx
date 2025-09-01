import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/services/api";

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number",
      });
      setLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: "Password must start with a capital letter, include at least one number, and one special character",
      });
      setLoading(false);
      return;
    }

    try {
      const newUser = {
        name,
        mobile,
        email,
        password,
        role: "employee", // default role
      };

      // Step 1: Sign up the user
      const signupRes = await authAPI.register(newUser);

      if (signupRes.status !== 201) {
        toast({
          variant: "destructive",
          title: "Signup Failed",
          description: signupRes.data.message || "Signup failed. Please try again.",
        });
        setLoading(false);
        return;
      }

      // Step 2: Automatically log in the user after successful signup
      const loginRes = await authAPI.login({ email, password });

      if (loginRes.status !== 200) {
        toast({
          variant: "destructive",
          title: "Auto-login Failed",
          description: "Account created but login failed. Please login manually.",
        });
        // Reset form and redirect to login
        setName("");
        setEmail("");
        setMobile("");
        setPassword("");
        navigate("/login");
        setLoading(false);
        return;
      }

      const { user } = loginRes.data;

      // Store user info in localStorage (token is in HTTP-only cookies)
      localStorage.setItem("user", JSON.stringify(user));

      // Reset form
      setName("");
      setEmail("");
      setMobile("");
      setPassword("");

      // Show success toast
      toast({
        variant: "default",
        title: "Signup & Login Successful",
        description: `Welcome, ${user.name}! You have been automatically logged in.`,
      });

      // Navigate based on role
      if (user.role === "admin") {
        navigate("/dashboard", { replace: true });
      } else if (user.role === "employee") {
        navigate("/employee-dashboard", { replace: true });
      } else {
        toast({
          variant: "destructive",
          title: "Unknown Role",
          description: "Your account has an unknown role assigned. Please contact support.",
        });
        navigate("/login");
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome</CardTitle>
          <CardDescription>
            SignUp with your Apple or Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Button variant="outline" className="w-full">
                  SignUp with Apple
                </Button>
                <Button variant="outline" className="w-full">
                  SignUp with Google
                </Button>
              </div>

              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="mobile">Mobile No.</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    placeholder="Enter Your Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      pattern="^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$"
                      title="Password must start with a capital letter, include at least one number, and one special character"
                    />{" "}
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must start with a capital letter, include at least one number, and one special character
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing up..." : "SignUp"}
                </Button>
              </div>

              <div className="text-center text-sm">
                I have an account?{" "}
                <Link to="/login" className="text-blue-600 underline">
                  Login
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-center text-xs text-balance">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
