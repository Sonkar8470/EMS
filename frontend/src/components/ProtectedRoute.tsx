import type { JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

type Role = "admin" | "employee";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: JSX.Element;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const { user, loading } = useAuth();

  console.log("ProtectedRoute: Current state", { user, loading, allowedRoles, pathname: location.pathname });

  // Show loading while checking authentication
  if (loading) {
    console.log("ProtectedRoute: Loading state, showing loading screen");
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    console.log("ProtectedRoute: No user found, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role as Role)) {
    const redirectPath = user.role === "admin" ? "/dashboard" : "/employee-dashboard";
    console.log(`ProtectedRoute: User role ${user.role} not allowed for ${allowedRoles.join(", ")}, redirecting to ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  }

  console.log("ProtectedRoute: Access granted, rendering children");
  return children;
}


