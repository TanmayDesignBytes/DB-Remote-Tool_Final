import React from "react";
import AuthCardShell from "./AuthCardShell.jsx";
import SignupForm from "./SignupForm.jsx";

function SignupCard() {
  return (
    <AuthCardShell
      title="Create your account"
      description="Join us today to get started."
    >
      <SignupForm />
    </AuthCardShell>
  );
}

export default SignupCard;
