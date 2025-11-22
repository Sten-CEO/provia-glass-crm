import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccessControls, type AccessControls } from "@/hooks/useAccessControls";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredAccess?: keyof AccessControls;
}

export const ProtectedRoute = ({ children, requiredAccess }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess, loading, userRole } = useAccessControls();

  useEffect(() => {
    // Wait for loading to complete
    if (loading) return;

    // If no specific access required, allow access
    if (!requiredAccess) return;

    // Check if user has required access
    if (!hasAccess(requiredAccess)) {
      // Redirect to dashboard with error message
      navigate("/tableau-de-bord", {
        replace: true,
        state: { from: location, accessDenied: true }
      });
    }
  }, [requiredAccess, hasAccess, loading, navigate, location]);

  // Show loading while checking permissions
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no access required or user has access, render children
  if (!requiredAccess || hasAccess(requiredAccess)) {
    return <>{children}</>;
  }

  // While redirecting, show nothing
  return null;
};
