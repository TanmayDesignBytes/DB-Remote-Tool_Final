import React from "react";

function AuthPageShell({ children }) {
  return (
    <main className="login-bg flex items-center justify-center px-4 py-8">
      {children}
    </main>
  );
}

export default AuthPageShell;
