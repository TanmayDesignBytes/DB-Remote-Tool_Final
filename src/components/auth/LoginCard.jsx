import React from "react";
import AuthCardShell from "./AuthCardShell.jsx";
import LoginForm from "./LoginForm.jsx";

function LoginCard() {
  return (
    <AuthCardShell
      title="Log in to your account"
      description="Welcome back! Please enter your details."
    >
      <LoginForm />
    </AuthCardShell>
  );
}

export default LoginCard;
