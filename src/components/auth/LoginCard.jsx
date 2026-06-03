import React from "react";
import { Link } from "react-router-dom";
import AuthCardShell from "./AuthCardShell.jsx";
import LoginForm from "./LoginForm.jsx";

function LoginCard() {
  return (
    <AuthCardShell
      title="Log in to your account"
      description="Welcome back! Please enter your details."
    >
      <LoginForm />
      <div className="flex items-center justify-center gap-[0.375rem] self-stretch">
        <span className="font-poppins text-[0.875rem] font-normal leading-[1.375rem] text-gray-600">
          Don't have an account?
        </span>
        <Link
          className="font-poppins text-[0.875rem] font-semibold leading-[1.375rem] text-blue-500"
          to="/signup"
        >
          Sign up
        </Link>
      </div>
    </AuthCardShell>
  );
}

export default LoginCard;
