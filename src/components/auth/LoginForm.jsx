import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthFeedbackMessage from "./AuthFeedbackMessage.jsx";
import FormField from "./FormField.jsx";
import { loginUser } from "../../lib/api.js";
import {
  buildUserProfileFromAuthResponse,
  persistAuthSession,
} from "../../lib/auth.js";

function LoginForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    const nextStatusMessage = location.state?.statusMessage || "";
    setStatusMessage(nextStatusMessage);
  }, [location.state]);

  const updateField = (field) => (event) => {
    const value =
      field === "rememberMe" ? event.target.checked : event.target.value;

    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = formValues.email.trim();

    if (!email || !formValues.password) {
      setErrorMessage("Enter your email and password to sign in.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await loginUser({
        email,
        password: formValues.password,
      });
      const token = response?.token || response?.data?.token || "";

      if (!token) {
        throw new Error("Login succeeded but no token was returned.");
      }

      const profile = buildUserProfileFromAuthResponse(response, email);

      persistAuthSession({
        token,
        rememberMe: formValues.rememberMe,
        profile,
      });
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(error?.message || "Unable to sign in. Please try again.");
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
            label="Email"
            type="email"
            placeholder="Enter your email"
            id="login-email"
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
            id="login-password"
            name="password"
            value={formValues.password}
            onChange={updateField("password")}
            autoComplete="current-password"
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
        </div>

        <AuthFeedbackMessage message={statusMessage} tone="success" />
        <AuthFeedbackMessage message={errorMessage} tone="error" />

        <div className="flex h-[3.125rem] items-center justify-between gap-[1.5rem] self-stretch">
          <label className="flex items-center gap-[0.75rem] font-poppins text-[0.875rem] font-medium leading-[1.375rem] text-gray-700">
            <input
              type="checkbox"
              className="h-[1.125rem] w-[1.125rem] accent-blue-500"
              checked={formValues.rememberMe}
              onChange={updateField("rememberMe")}
              disabled={isSubmitting}
            />
            Remember me
          </label>

          <Link
            className="font-poppins text-[0.875rem] font-medium leading-[1.375rem] text-blue-500"
            to="/forgot-password"
          >
            Forgot password
          </Link>
        </div>
      </div>

      <button
        className="flex h-[3.125rem] w-full items-center justify-center gap-[0.375rem] self-stretch rounded-[6.25rem] border border-[#356FE8] bg-[linear-gradient(90deg,#3973EE_0%,#356FE8_55%,#2F67E0_100%)] px-[1rem] py-[0.625rem] font-inter text-[1rem] font-semibold leading-[1.5rem] text-white shadow-input transition-all duration-200 hover:border-[#5F8EF5] hover:bg-[linear-gradient(90deg,#5488FA_0%,#3C76F2_42%,#2C64DF_100%)] hover:shadow-[0_0.625rem_1.375rem_rgba(41,112,255,0.2),0_0_0_0.0625rem_rgba(95,142,245,0.55)] disabled:cursor-not-allowed disabled:opacity-80"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export default LoginForm;
