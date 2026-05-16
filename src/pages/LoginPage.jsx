import React from "react";
import AuthPageShell from "../components/auth/AuthPageShell.jsx";
import LoginCard from "../components/auth/LoginCard.jsx";

function LoginPage() {
  return (
    <AuthPageShell>
      <LoginCard />
    </AuthPageShell>
  );
}

export default LoginPage;
