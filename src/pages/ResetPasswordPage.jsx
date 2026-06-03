import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthCardShell from "../components/auth/AuthCardShell.jsx";
import AuthPageShell from "../components/auth/AuthPageShell.jsx";
import FormField from "../components/auth/FormField.jsx";
import { resetPassword } from "../lib/api.js";
import { getResetTokenFromLocation } from "../lib/passwordReset.js";

function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resetToken = getResetTokenFromLocation(location.pathname, location.search);

  useEffect(() => {
    const nextStatusMessage = location.state?.statusMessage;

    if (nextStatusMessage) {
      toast.info(nextStatusMessage);
    }
  }, [location.state]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!resetToken) {
      toast.error(
        "Reset link is missing or invalid. Please open the reset link from your email again.",
      );
      return;
    }

    if (!newPassword) {
      toast.error("Enter your new password to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({
        token: resetToken,
        newPassword,
      });

      toast.success(
        response?.message ||
          "Password reset successful. Redirecting to login...",
      );
      
      setTimeout(() => {
        navigate("/", {
          replace: true,
        });
      }, 1500);
    } catch (error) {
      toast.error(error?.message || "Unable to reset your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell>
      <AuthCardShell
        title="Reset your password"
        description="Enter your new password to complete the reset flow."
      >
        <form
          className="flex flex-col items-center gap-[4.75rem] self-stretch"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col items-start gap-[1.5rem] self-stretch">
            <FormField
              label="New password"
              type="password"
              placeholder="Enter your new password"
              id="reset-password"
              name="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isSubmitting}
            />

            <div className="flex h-[3.125rem] items-center justify-between gap-[1.5rem] self-stretch">
              <span className="font-poppins text-[0.875rem] font-normal leading-[1.25rem] text-gray-600">
                Need a new reset link?
              </span>
              <Link
                className="font-poppins text-[0.875rem] font-medium leading-[1.375rem] text-blue-500"
                to="/forgot-password"
              >
                Request again
              </Link>
            </div>
          </div>

          <button
            className="flex h-[3.125rem] w-full items-center justify-center gap-[0.375rem] self-stretch rounded-[6.25rem] border border-[#356FE8] bg-[linear-gradient(90deg,#3973EE_0%,#356FE8_55%,#2F67E0_100%)] px-[1rem] py-[0.625rem] font-inter text-[1rem] font-semibold leading-[1.5rem] text-white shadow-input transition-all duration-200 hover:border-[#5F8EF5] hover:bg-[linear-gradient(90deg,#5488FA_0%,#3C76F2_42%,#2C64DF_100%)] hover:shadow-[0_0.625rem_1.375rem_rgba(41,112,255,0.2),0_0_0_0.0625rem_rgba(95,142,245,0.55)] disabled:cursor-not-allowed disabled:opacity-80"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </AuthCardShell>
    </AuthPageShell>
  );
}

export default ResetPasswordPage;
