import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/services/api";
import { Eye, EyeOff } from "lucide-react";

type SignUpFormState = {
  name: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function SignUpForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<SignUpFormState>({
    name: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const setField = (key: keyof SignUpFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (error) setError("");
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!/^[0-9]{10}$/.test(form.mobile.trim())) return "Enter a valid 10-digit mobile number";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email";
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(form.password))
      return "Password must start with a capital letter, include at least one number, and one special character";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    return "";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent browser default validation popups
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "employee",
      };
      const res = await authAPI.register(payload);
      if (res.status >= 200 && res.status < 300) {
        toast({ title: "Registration successful", description: "You can now sign in." });
        setForm({ name: "", mobile: "", email: "", password: "", confirmPassword: "" });
        navigate("/login");
      } else {
        setError((res.data as { message?: string })?.message || "Registration failed");
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
      setError(anyErr?.response?.data?.message || anyErr?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 w-full max-w-sm mx-auto ${className || ""}`} {...props}>
      <Card className="w-full">
        <CardHeader className="text-center pt-6">
          <CardTitle className="text-lg sm:text-xl">Create Account</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" value={form.name} onChange={setField("name")} />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                maxLength={10}
                placeholder="1234567890"
                value={form.mobile}
                onChange={setField("mobile")}
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={setField("email")}
              />
            </div>
            <div className="relative">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={setField("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={setField("confirmPassword")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="flex justify-center mt-4">
            <p className="text-sm">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
