import React from "react";
import AuthPageShell from "../components/auth/AuthPageShell.jsx";
import SignupCard from "../components/auth/SignupCard.jsx";

function SignupPage() {
  return (
    <AuthPageShell scrollable>
      <SignupCard />
    </AuthPageShell>
  );
}

export default SignupPage;
