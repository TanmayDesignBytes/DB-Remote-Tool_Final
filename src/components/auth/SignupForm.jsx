import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "./FormField.jsx";
import { signupUser } from "../../lib/api.js";
import {
  buildUserProfileFromAuthResponse,
  persistAuthSession,
} from "../../lib/auth.js";

function SignupForm() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const updateField = (field) => (event) => {
    setFormValues((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const validateForm = () => {
    const { username, email, password, confirmPassword } =
      formValues;

    if (!username.trim()) {
      toast.error("Please enter a username.");
      return false;
    }

    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    if (!password) {
      toast.error("Please enter a password.");
      return false;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return false;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await signupUser({
        username: formValues.username.trim(),
        email: formValues.email.trim(),
        password: formValues.password,
      });

      const token = response?.token || response?.data?.token || "";

      if (token) {
        // Auto-login if token is returned
        toast.success("Account created successfully! Logging you in...");
        const profile = buildUserProfileFromAuthResponse(
          response,
          formValues.email.trim()
        );

        persistAuthSession({
          token,
          rememberMe: true,
          profile,
        });

        navigate("/dashboard");
      } else {
        // No token, redirect to login
        toast.success("Account created successfully. Please sign in.");
        navigate("/", {
          replace: true,
          state: {
            statusMessage: "Account created successfully. Please sign in.",
          },
        });
      }
    } catch (error) {
      toast.error(
        error?.message || "Unable to create account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="flex flex-col items-center gap-[4.75rem] self-stretch"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col items-start gap-[1.5rem] self-stretch">
        <div className="flex flex-col items-start gap-[1.25rem] self-stretch">
          <FormField
            label="Username"
            type="text"
            placeholder="Enter your username"
            id="signup-username"
            name="username"
            value={formValues.username}
            onChange={updateField("username")}
            autoComplete="username"
            disabled={isSubmitting}
          />

          <FormField
            label="Email"
            type="email"
            placeholder="Enter your email"
            id="signup-email"
            name="email"
            value={formValues.email}
            onChange={updateField("email")}
            autoComplete="email"
            disabled={isSubmitting}
          />

          <FormField
            label="Password"
            type={isPasswordVisible ? "text" : "password"}
            placeholder="••••••••"
            id="signup-password"
            name="password"
            value={formValues.password}
            onChange={updateField("password")}
            autoComplete="new-password"
            disabled={isSubmitting}
            trailingAdornment={
              <button
                type="button"
                aria-label={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsPasswordVisible((value) => !value)}
                disabled={isSubmitting}
                className="flex h-[2rem] w-[2rem] items-center justify-center rounded-full text-[#5D657D] transition-colors hover:bg-[#EEF4FF] hover:text-[#2970FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPasswordVisible ? (
                  <EyeOff className="h-[1.125rem] w-[1.125rem]" />
                ) : (
                  <Eye className="h-[1.125rem] w-[1.125rem]" />
                )}
              </button>
            }
          />

          <FormField
            label="Confirm password"
            type={isConfirmPasswordVisible ? "text" : "password"}
            placeholder="••••••••"
            id="signup-confirmPassword"
            name="confirmPassword"
            value={formValues.confirmPassword}
            onChange={updateField("confirmPassword")}
            autoComplete="new-password"
            disabled={isSubmitting}
            trailingAdornment={
              <button
                type="button"
                aria-label={
                  isConfirmPasswordVisible ? "Hide password" : "Show password"
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  setIsConfirmPasswordVisible((value) => !value)
                }
                disabled={isSubmitting}
                className="flex h-[2rem] w-[2rem] items-center justify-center rounded-full text-[#5D657D] transition-colors hover:bg-[#EEF4FF] hover:text-[#2970FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isConfirmPasswordVisible ? (
                  <EyeOff className="h-[1.125rem] w-[1.125rem]" />
                ) : (
                  <Eye className="h-[1.125rem] w-[1.125rem]" />
                )}
              </button>
            }
          />
        </div>
      </div>

      <button
        className="flex h-[3.125rem] w-full items-center justify-center gap-[0.375rem] self-stretch rounded-[6.25rem] border border-[#356FE8] bg-[linear-gradient(90deg,#3973EE_0%,#356FE8_55%,#2F67E0_100%)] px-[1rem] py-[0.625rem] font-inter text-[1rem] font-semibold leading-[1.5rem] text-white shadow-input transition-all duration-200 hover:border-[#5F8EF5] hover:bg-[linear-gradient(90deg,#5488FA_0%,#3C76F2_42%,#2C64DF_100%)] hover:shadow-[0_0.625rem_1.375rem_rgba(41,112,255,0.2),0_0_0_0.0625rem_rgba(95,142,245,0.55)] disabled:cursor-not-allowed disabled:opacity-80"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      <div className="flex items-center justify-center gap-[0.375rem] self-stretch">
        <span className="font-poppins text-[0.875rem] font-normal leading-[1.375rem] text-gray-600">
          Already have an account?
        </span>
        <Link
          className="font-poppins text-[0.875rem] font-semibold leading-[1.375rem] text-blue-500"
          to="/"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}

export default SignupForm;
