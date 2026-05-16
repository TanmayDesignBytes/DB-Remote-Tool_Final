import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import { hasActiveAuthSession } from "./lib/auth.js";

const LAST_PROTECTED_PATH_KEY = "dws.lastProtectedPath";
const DEFAULT_PROTECTED_PATH = "/dashboard";

function getLastProtectedPath() {
  if (typeof window === "undefined") {
    return DEFAULT_PROTECTED_PATH;
  }

  const storedPath = window.sessionStorage.getItem(LAST_PROTECTED_PATH_KEY);

  if (storedPath && storedPath.startsWith("/")) {
    return storedPath;
  }

  return DEFAULT_PROTECTED_PATH;
}

function rememberProtectedPath(pathname, search = "", hash = "") {
  if (typeof window === "undefined" || !pathname.startsWith("/dashboard")) {
    return;
  }

  window.sessionStorage.setItem(
    LAST_PROTECTED_PATH_KEY,
    `${pathname}${search}${hash}`,
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();

  useEffect(() => {
    if (hasActiveAuthSession()) {
      rememberProtectedPath(location.pathname, location.search, location.hash);
    }
  }, [location.hash, location.pathname, location.search]);

  return hasActiveAuthSession() ? children : <Navigate to="/" replace />;
}

function PublicRoute({ children }) {
  return hasActiveAuthSession() ? (
    <Navigate to={getLastProtectedPath()} replace />
  ) : (
    children
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password/*"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={hasActiveAuthSession() ? getLastProtectedPath() : "/"}
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
