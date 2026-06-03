import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ContentPanel from "./ContentPanel";

function AppShell({
  children,
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
  searchSuggestions,
  onSearchSuggestionSelect,
}) {
  return (
    <main className="app-shell-root h-screen w-screen overflow-hidden bg-white">
      <div className="app-shell-surface relative h-full w-full overflow-hidden border border-[#CED9E7] bg-[linear-gradient(to_top,#C8DAF2_0%,#D8E8F7_25%,#FFFFFF_70%)] shadow-[0_0.5rem_1.5rem_rgba(16,24,40,0.08),0_0.25rem_0.75rem_rgba(16,24,40,0.04)]">
        <Header
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchSuggestions={searchSuggestions}
          onSearchSuggestionSelect={onSearchSuggestionSelect}
        />
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
        <ContentPanel>{children}</ContentPanel>
      </div>
    </main>
  );
}

export default AppShell;
