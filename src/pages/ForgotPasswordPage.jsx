import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCardShell from "../components/auth/AuthCardShell.jsx";
import AuthFeedbackMessage from "../components/auth/AuthFeedbackMessage.jsx";
import AuthPageShell from "../components/auth/AuthPageShell.jsx";
import FormField from "../components/auth/FormField.jsx";
import { forgotPassword } from "../lib/api.js";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setErrorMessage("Enter your email to continue.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await forgotPassword({ email: normalizedEmail });

      if (response?.token) {
        navigate(`/reset-password?token=${encodeURIComponent(response.token)}`, {
          state: {
            email: normalizedEmail,
            statusMessage:
              "Reset token received for testing. It has been filled into the next form.",
          },
        });
        return;
      }

      setStatusMessage(
        response?.message || "Reset request submitted. Check your email for the reset link.",
      );
    } catch (error) {
      setErrorMessage(error?.message || "Unable to start the reset flow. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell>
      <AuthCardShell
        title="Forgot your password?"
        description="Enter your email and we will trigger the reset flow."
      >
        <form
          className="flex flex-col items-center gap-[4.75rem] self-stretch"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col items-start gap-[1.5rem] self-stretch">
            <FormField
              label="Email"
              type="email"
              placeholder="Enter your email"
              id="forgot-password-email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={isSubmitting}
            />

            <AuthFeedbackMessage message={statusMessage} tone="success" />
            <AuthFeedbackMessage message={errorMessage} tone="error" />

            <div className="flex h-[3.125rem] items-center justify-between gap-[1.5rem] self-stretch">
              <span className="font-poppins text-[0.875rem] font-normal leading-[1.25rem] text-gray-600">
                Remembered your password?
              </span>
              <Link
                className="font-poppins text-[0.875rem] font-medium leading-[1.375rem] text-blue-500"
                to="/"
              >
                Back to sign in
              </Link>
            </div>
          </div>

          <button
            className="flex h-[3.125rem] w-full items-center justify-center gap-[0.375rem] self-stretch rounded-[6.25rem] border border-[#356FE8] bg-[linear-gradient(90deg,#3973EE_0%,#356FE8_55%,#2F67E0_100%)] px-[1rem] py-[0.625rem] font-inter text-[1rem] font-semibold leading-[1.5rem] text-white shadow-input transition-all duration-200 hover:border-[#5F8EF5] hover:bg-[linear-gradient(90deg,#5488FA_0%,#3C76F2_42%,#2C64DF_100%)] hover:shadow-[0_0.625rem_1.375rem_rgba(41,112,255,0.2),0_0_0_0.0625rem_rgba(95,142,245,0.55)] disabled:cursor-not-allowed disabled:opacity-80"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </AuthCardShell>
    </AuthPageShell>
  );
}

export default ForgotPasswordPage;
