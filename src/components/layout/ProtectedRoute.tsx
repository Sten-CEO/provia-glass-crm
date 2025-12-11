import { ReactNode } from "react";
import { useAccessControls, type AccessControls } from "@/hooks/useAccessControls";
import { AccessDeniedOverlay } from "./AccessDeniedOverlay";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredAccess?: keyof AccessControls;
}

export const ProtectedRoute = ({ children, requiredAccess }: ProtectedRouteProps) => {
  const { hasAccess, loading, userRole } = useAccessControls();

  // Show loading while checking permissions
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no access required or user has access, render children normally
  if (!requiredAccess || hasAccess(requiredAccess)) {
    return <>{children}</>;
  }

  // If access is denied, show the page with overlay (no redirect)
  return (
    <div className="relative">
      {/* Render the page content (will be blurred by overlay) */}
      <div className="pointer-events-none select-none">
        {children}
      </div>

      {/* Show access denied overlay on top */}
      <AccessDeniedOverlay />
    </div>
  );
};
