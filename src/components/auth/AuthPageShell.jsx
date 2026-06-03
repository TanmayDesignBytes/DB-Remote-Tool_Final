import React from "react";

function AuthPageShell({ children, scrollable = false }) {
  if (scrollable) {
    return (
      <div className="login-bg fixed inset-0 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full items-start justify-center px-[1rem] py-[2rem] lg:items-center">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg fixed inset-0 flex items-center justify-center overflow-hidden">
      {children}
    </div>
  );
}

export default AuthPageShell;
