import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import DashboardContent from "../components/dashboard/DashboardContent.jsx";
import GroupContent from "../components/group/GroupContent.jsx";
import RemoteContent from "../components/remote/RemoteContent.jsx";

function normalizeDashboardPath(pathname) {
  if (!pathname || pathname === "/") {
    return "/dashboard";
  }

  return pathname.replace(/\/+$/, "");
}

function resolveActiveTab(pathname) {
  const normalizedPath = normalizeDashboardPath(pathname);

  if (normalizedPath.startsWith("/dashboard/group")) {
    return "group";
  }

  if (
    normalizedPath.startsWith("/dashboard/remote-screen") ||
    normalizedPath.startsWith("/dashboard/remote")
  ) {
    return "remote";
  }

  return "dashboard";
}

function resolveTabRoute(tabKey) {
  if (tabKey === "group") {
    return "/dashboard/group";
  }

  if (tabKey === "remote") {
    return "/dashboard/remote-screen";
  }

  return "/dashboard";
}

function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isDashboardOverlayOpen, setIsDashboardOverlayOpen] = useState(false);
  const activeTab = useMemo(
    () => resolveActiveTab(location.pathname),
    [location.pathname],
  );
  const sidebarActiveTab =
    activeTab === "dashboard" && isDashboardOverlayOpen ? null : activeTab;

  const handleTabChange = (tabKey) => {
    setIsDashboardOverlayOpen(false);
    setSearchSuggestions([]);
    const nextRoute = resolveTabRoute(tabKey);
    const currentRoute = normalizeDashboardPath(location.pathname);

    if (nextRoute === currentRoute) {
      return;
    }

    navigate(nextRoute);
  };

  useEffect(() => {
    if (activeTab !== "dashboard") {
      setSearchSuggestions([]);
    }
  }, [activeTab]);

  return (
    <AppShell
      activeTab={sidebarActiveTab}
      onTabChange={handleTabChange}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchSuggestions={searchSuggestions}
      onSearchSuggestionSelect={(suggestion) => {
        if (suggestion?.type === "group") {
          setSearchSuggestions([]);
          navigate("/dashboard/group");
        }
      }}
    >
      {activeTab === "dashboard" ? (
        <DashboardContent
          searchQuery={searchQuery}
          onDashboardOverlayChange={setIsDashboardOverlayOpen}
          onSearchSuggestionsChange={setSearchSuggestions}
        />
      ) : activeTab === "group" ? (
        <GroupContent searchQuery={searchQuery} />
      ) : (
        <RemoteContent onNavigateDashboard={() => navigate("/dashboard")} />
      )}
    </AppShell>
  );
}

export default DashboardPage;
