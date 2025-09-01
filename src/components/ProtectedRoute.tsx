import type { JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";

type Role = "admin" | "employee";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: JSX.Element;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  let user: { role: Role } | null = null;

  try {
    // Still using localStorage for user info, but token is in HTTP-only cookies
    const raw = localStorage.getItem("user");
    user = raw ? (JSON.parse(raw) as { role: Role }) : null;
  } catch {
    user = null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const redirectPath = user.role === "admin" ? "/dashboard" : "/employee-dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}


