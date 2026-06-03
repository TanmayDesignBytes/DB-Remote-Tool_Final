import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ChevronDown, Eye, EyeOff, X } from "lucide-react";
import {
  broadcastProfileUpdate,
  clearStoredAuth,
  readStoredUserProfile,
} from "../../lib/auth.js";
import {
  getUserInfo,
  sendEmailOtp,
  updateProfile,
  verifyEmailOtp,
} from "../../lib/api.js";

const ACCOUNT_PRIMARY_BUTTON_CLASS =
  "rounded-[0.75rem] border border-[#356FE8] bg-[linear-gradient(90deg,#3973EE_0%,#356FE8_55%,#2F67E0_100%)] px-4 py-2.5 font-inter text-[0.8125rem] font-semibold text-white shadow-input transition-all duration-200 hover:border-[#5F8EF5] hover:bg-[linear-gradient(90deg,#5488FA_0%,#3C76F2_42%,#2C64DF_100%)] hover:shadow-[0_0.625rem_1.375rem_rgba(41,112,255,0.2),0_0_0_0.0625rem_rgba(95,142,245,0.55)] disabled:cursor-not-allowed disabled:opacity-80";

const DEFAULT_ACCOUNT = {
  email: "",
  username: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const DEFAULT_EMAIL_MODAL = {
  newEmail: "",
  currentPassword: "",
};

const DEFAULT_OTP_MODAL = {
  otp: "",
};

const DEFAULT_PASSWORD_VISIBILITY = {
  currentPassword: false,
  newPassword: false,
  confirmPassword: false,
  emailPassword: false,
};

function normalizeProfile(response, fallbackProfile = null) {
  const profile =
    response?.data?.user ||
    response?.data ||
    response?.user ||
    response ||
    {};
  const fallback = fallbackProfile || {};
  const username =
    profile.username ||
    profile.name ||
    profile.fullName ||
    fallback.username ||
    "User";
  const email = profile.email || fallback.email || "";

  return {
    username,
    email,
    firstLetter:
      profile.firstLetter ||
      fallback.firstLetter ||
      username.trim().charAt(0).toUpperCase() ||
      "U",
    profileImage:
      profile.profileImage ||
      profile.avatarUrl ||
      profile.photoUrl ||
      fallback.profileImage ||
      "",
  };
}

function DrawerAvatar({ profile }) {
  const profileImage =
    profile.profileImage || profile.avatarUrl || profile.photoUrl || "";
  const firstLetter = (profile.firstLetter || profile.username || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={profile.username || "User avatar"}
        className="h-[3.25rem] w-[3.25rem] rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2970FF_0%,#6AA4FF_100%)] font-inter text-[1.25rem] font-bold text-white">
      {firstLetter}
    </div>
  );
}

function AccountField({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
  trailingAdornment = null,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isFilled = String(value ?? "").trim().length > 0;

  return (
    <label className="flex flex-col gap-[0.4375rem]">
      <span className="font-inter text-[0.8125rem] font-semibold leading-5 text-[#475467]">
        {label}
      </span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={[
            "h-[2.875rem] w-full rounded-[0.75rem] border px-[0.875rem] font-inter text-[0.9375rem] text-[#1F2937] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[#B5BAC1] focus:border-[#84ADFF] focus:ring-2 focus:ring-[#2970FF]/20 disabled:bg-[#F8FAFC] disabled:text-[#98A2B3]",
            isFilled && !isFocused
              ? "border-[#D5DDEB] bg-[#F8FAFC]"
              : "border-[#D0D5DD] bg-white",
            trailingAdornment ? "pr-[3rem]" : "",
          ].join(" ")}
        />
        {trailingAdornment ? (
          <div className="absolute right-[0.625rem] top-1/2 flex -translate-y-1/2 items-center">
            {trailingAdornment}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function FeedbackMessage({ tone = "error", children }) {
  if (!children) {
    return null;
  }

  const isError = tone === "error";

  return (
    <div
      className={[
        "rounded-[0.75rem] border px-4 py-3 font-inter text-[0.8125rem] leading-5",
        isError
          ? "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]"
          : "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function DrawerModal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[rgba(15,23,42,0.36)] p-4 backdrop-blur-[0.125rem]">
      <div className="w-full max-w-[30rem] overflow-hidden rounded-[1rem] bg-white shadow-[0_1.5625rem_3.125rem_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between border-b border-[#EAECF0] px-[1.25rem] py-[0.875rem]">
          <h3 className="font-inter text-[1rem] font-semibold text-[#101828]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#475467] transition-colors hover:bg-[#F2F4F7]"
            aria-label={`Close ${title}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 px-[1.25rem] py-[1.25rem]">{children}</div>

        <div className="flex justify-end gap-3 border-t border-[#EAECF0] px-[1.25rem] py-[0.875rem]">
          {footer}
        </div>
      </div>
    </div>
  );
}

function AccountDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const storedProfile = useMemo(() => readStoredUserProfile(), [open]);
  const [accountDetails, setAccountDetails] = useState(() => ({
    ...DEFAULT_ACCOUNT,
    email: storedProfile?.email || "",
    username: storedProfile?.username || "",
  }));
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [emailModalDetails, setEmailModalDetails] =
    useState(DEFAULT_EMAIL_MODAL);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpModalDetails, setOtpModalDetails] = useState(DEFAULT_OTP_MODAL);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [visiblePasswordFields, setVisiblePasswordFields] = useState(
    DEFAULT_PASSWORD_VISIBILITY,
  );

  const handleInvalidSession = useCallback(
    (error) => {
      const message = String(error?.message || "").toLowerCase();
      const isInvalidSession =
        error?.status === 401 ||
        message.includes("invalid token") ||
        message.includes("not authorized");

      if (!isInvalidSession) {
        return false;
      }

      clearStoredAuth();
      onClose?.();
      navigate("/", { replace: true });
      return true;
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let isMounted = true;
    const fallbackProfile = readStoredUserProfile();

    setAccountDetails((current) => ({
      ...current,
      email: fallbackProfile?.email || "",
      username: fallbackProfile?.username || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
    setProfileError("");
    setProfileSuccess("");
    setIsPasswordChangeOpen(false);
    setVisiblePasswordFields(DEFAULT_PASSWORD_VISIBILITY);
    document.body.style.overflow = "hidden";

    const loadAccount = async () => {
      try {
        const response = await getUserInfo();
        const profile = normalizeProfile(response, fallbackProfile);

        if (!isMounted) {
          return;
        }

        setAccountDetails((current) => ({
          ...current,
          email: profile.email,
          username: profile.username,
        }));
        broadcastProfileUpdate(profile);
      } catch (error) {
        if (handleInvalidSession(error)) {
          return;
        }

        // Stored profile is enough for the drawer shell.
      }
    };

    void loadAccount();

    return () => {
      isMounted = false;
      document.body.style.overflow = "unset";
    };
  }, [handleInvalidSession, open]);

  if (!open) {
    return null;
  }

  const drawerProfile = normalizeProfile(
    {
      data: {
        email: accountDetails.email,
        username: accountDetails.username,
      },
    },
    storedProfile,
  );

  const updateField = (field) => (event) => {
    setAccountDetails((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateEmailModalField = (field) => (event) => {
    setEmailModalDetails((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateOtpModalField = (field) => (event) => {
    setOtpModalDetails((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleUpdateCredentials = async () => {
    setProfileError("");
    setProfileSuccess("");
    setIsUpdatingProfile(true);

    try {
      await updateProfile({
        currentPassword: isPasswordChangeOpen
          ? accountDetails.currentPassword
          : "",
        newPassword: isPasswordChangeOpen ? accountDetails.newPassword : "",
        confirmNewPassword: isPasswordChangeOpen
          ? accountDetails.confirmPassword
          : "",
        newName: accountDetails.username,
      });

      const updatedProfile = normalizeProfile(
        {
          data: {
            email: accountDetails.email,
            username: accountDetails.username,
          },
        },
        storedProfile,
      );

      broadcastProfileUpdate(updatedProfile);
      setAccountDetails((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setVisiblePasswordFields((current) => ({
        ...current,
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      }));
      setIsPasswordChangeOpen(false);
      setProfileSuccess("Profile updated successfully.");
      toast.success("Profile updated successfully!");
    } catch (error) {
      if (handleInvalidSession(error)) {
        return;
      }

      const errorMsg = error?.message || "Unable to update profile right now.";
      setProfileError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    setEmailError("");
    setIsUpdatingEmail(true);

    try {
      await sendEmailOtp({
        newEmail: emailModalDetails.newEmail,
        currentPassword: emailModalDetails.currentPassword,
      });
      setIsChangeEmailOpen(false);
      setVisiblePasswordFields((current) => ({
        ...current,
        emailPassword: false,
      toast.info("OTP sent to your email. Please verify it.");
    } catch (error) {
      if (handleInvalidSession(error)) {
        return;
      }

      const errorMsg = error?.message || "Unable to update email right now.";
      setEmailError(errorMsg);
      toast.error(errorMsg
      }

      setEmailError(error?.message || "Unable to update email right now.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    setIsVerifyingOtp(true);

    try {
      const response = await verifyEmailOtp({ otp: otpModalDetails.otp });
      const nextEmail =
        response?.data?.email ||
        emailModalDetails.newEmail ||
        accountDetails.email;
      const updatedProfile = normalizeProfile(
        {
          data: {
            email: nextEmail,
            username: accountDetails.username,
          },
        },
        storedProfile,
      );

      broadcastProfileUpdate(updatedProfile);
      setAccountDetails((current) => ({
        ...current,
        email: nextEmail,
      }));
      setProfileSuccess("Email updated successfully.");
      setIsOtpModalOpen(false);
      toast.success("Email updated successfully!");
    } catch (error) {
      if (handleInvalidSession(error)) {
        return;
      }

      const errorMsg = error?.message || "Unable to verify OTP right now.";
      setOtpError(errorMsg);
      toast.error(errorMsg
    } catch (error) {
      if (handleInvalidSession(error)) {
        return;
      }

      setOtpError(error?.message || "Unable to verify OTP right now.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswordFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const renderPasswordToggle = (field, label, disabled = false) => {
    const isVisible = visiblePasswordFields[field];

    return (
      <button
        type="button"
        onClick={() => togglePasswordVisibility(field)}
        onMouseDown={(event) => event.preventDefault()}
        disabled={disabled}
        aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#667085] transition-colors hover:bg-[#F2F4F7] hover:text-[#101828] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isVisible ? (
          <EyeOff className="h-[1.0625rem] w-[1.0625rem]" />
        ) : (
          <Eye className="h-[1.0625rem] w-[1.0625rem]" />
        )}
      </button>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[1200] bg-[rgba(15,23,42,0.26)] backdrop-blur-[0.0625rem]"
        onClick={onClose}
      />
      <aside
        className="fixed bottom-0 right-0 top-0 z-[1201] flex w-[min(100vw,31rem)] flex-col bg-white shadow-[-1.5rem_0_3.5rem_rgba(15,23,42,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-label="My Account"
      >
        <div className="flex items-start justify-between border-b border-[#EAECF0] px-[1.5rem] py-[1.25rem]">
          <div className="flex min-w-0 items-center gap-3">
            <DrawerAvatar profile={drawerProfile} />
            <div className="min-w-0">
              <h2 className="truncate font-inter text-[1.125rem] font-semibold text-[#101828]">
                My Account
              </h2>
              <p className="mt-[0.1875rem] truncate font-inter text-[0.8125rem] text-[#667085]">
                {accountDetails.email || "No email available"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#475467] transition-colors hover:bg-[#F2F4F7]"
            aria-label="Close My Account"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-[1.5rem] py-[1.25rem]">
          <div className="rounded-[1rem] border border-[#EAECF0] bg-white p-[1rem] shadow-[0_0.0625rem_0.1875rem_rgba(16,24,40,0.06)]">
            <div className="mb-[1rem]">
              <h3 className="font-inter text-[0.9375rem] font-semibold text-[#101828]">
                Profile
              </h3>
              <p className="mt-[0.1875rem] font-inter text-[0.8125rem] leading-5 text-[#667085]">
                Save display name changes here. Password is only needed when you
                change your password.
              </p>
            </div>
            <div className="grid gap-4">
              <AccountField
                label="Email address"
                value={accountDetails.email}
                onChange={updateField("email")}
                placeholder="Enter your email"
                disabled
              />
              <AccountField
                label="Name"
                value={accountDetails.username}
                onChange={updateField("username")}
                placeholder="Enter your name"
              />
              <p className="-mt-[0.625rem] font-inter text-[0.75rem] font-medium leading-5 text-[#667085]">
                No current password needed for name changes.
              </p>
            </div>
          </div>

          <div className="mt-[1rem] rounded-[1rem] border border-[#EAECF0] bg-white shadow-[0_0.0625rem_0.1875rem_rgba(16,24,40,0.06)]">
            <button
              type="button"
              onClick={() => setIsPasswordChangeOpen((value) => !value)}
              className="flex w-full items-center justify-between px-[1rem] py-[0.9375rem] text-left"
            >
              <div>
                <h3 className="font-inter text-[0.9375rem] font-semibold text-[#101828]">
                  Change Password
                </h3>
                <p className="mt-[0.1875rem] font-inter text-[0.8125rem] leading-5 text-[#667085]">
                  Current password is required only inside this section.
                </p>
              </div>
              <ChevronDown
                className={[
                  "h-5 w-5 shrink-0 text-[#667085] transition-transform",
                  isPasswordChangeOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>

            {isPasswordChangeOpen ? (
              <div className="grid gap-4 border-t border-[#EAECF0] px-[1rem] py-[1rem]">
                <AccountField
                  label="Current password"
                  type={
                    visiblePasswordFields.currentPassword ? "text" : "password"
                  }
                  value={accountDetails.currentPassword}
                  onChange={updateField("currentPassword")}
                  placeholder="Enter current password"
                  trailingAdornment={renderPasswordToggle(
                    "currentPassword",
                    "current password",
                    isUpdatingProfile,
                  )}
                />
                <AccountField
                  label="New password"
                  type={visiblePasswordFields.newPassword ? "text" : "password"}
                  value={accountDetails.newPassword}
                  onChange={updateField("newPassword")}
                  placeholder="Enter new password"
                  trailingAdornment={renderPasswordToggle(
                    "newPassword",
                    "new password",
                    isUpdatingProfile,
                  )}
                />
                <AccountField
                  label="Retype new password"
                  type={
                    visiblePasswordFields.confirmPassword ? "text" : "password"
                  }
                  value={accountDetails.confirmPassword}
                  onChange={updateField("confirmPassword")}
                  placeholder="Confirm new password"
                  trailingAdornment={renderPasswordToggle(
                    "confirmPassword",
                    "retyped new password",
                    isUpdatingProfile,
                  )}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-[1rem] grid gap-3">
            <FeedbackMessage tone="error">{profileError}</FeedbackMessage>
            <FeedbackMessage tone="success">{profileSuccess}</FeedbackMessage>
          </div>

          <div className="mt-[1rem] flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEmailError("");
                setOtpError("");
                setEmailModalDetails(DEFAULT_EMAIL_MODAL);
                setOtpModalDetails(DEFAULT_OTP_MODAL);
                setVisiblePasswordFields((current) => ({
                  ...current,
                  emailPassword: false,
                }));
                setIsOtpModalOpen(false);
                setIsChangeEmailOpen(true);
              }}
              className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-4 py-2.5 font-inter text-[0.8125rem] font-semibold text-[#475467] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F8FAFC] hover:shadow-[0_0.625rem_1.25rem_rgba(15,23,42,0.08)]"
            >
              Change Email
            </button>
            <button
              type="button"
              onClick={handleUpdateCredentials}
              disabled={isUpdatingProfile}
              className={ACCOUNT_PRIMARY_BUTTON_CLASS}
            >
              {isUpdatingProfile
                ? "Updating..."
                : isPasswordChangeOpen
                  ? "Save Profile & Password"
                  : "Save Profile"}
            </button>
          </div>
        </div>
      </aside>

      {isChangeEmailOpen ? (
        <DrawerModal
          title="Change email"
          onClose={() => {
            if (isUpdatingEmail) return;
            setIsChangeEmailOpen(false);
            setEmailError("");
            setEmailModalDetails(DEFAULT_EMAIL_MODAL);
            setVisiblePasswordFields((current) => ({
              ...current,
              emailPassword: false,
            }));
          }}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  if (isUpdatingEmail) return;
                  setIsChangeEmailOpen(false);
                  setEmailError("");
                  setEmailModalDetails(DEFAULT_EMAIL_MODAL);
                  setVisiblePasswordFields((current) => ({
                    ...current,
                    emailPassword: false,
                  }));
                }}
                className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-4 py-2.5 font-inter text-[0.8125rem] font-semibold text-[#475467] transition-colors hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmailChange}
                disabled={isUpdatingEmail}
                className={ACCOUNT_PRIMARY_BUTTON_CLASS}
              >
                {isUpdatingEmail ? "Confirming..." : "Confirm"}
              </button>
            </>
          }
        >
          <AccountField
            label="New email"
            value={emailModalDetails.newEmail}
            onChange={updateEmailModalField("newEmail")}
            placeholder="Enter your new email"
          />
          <AccountField
            label="Password"
            type={visiblePasswordFields.emailPassword ? "text" : "password"}
            value={emailModalDetails.currentPassword}
            onChange={updateEmailModalField("currentPassword")}
            placeholder="Enter current password"
            trailingAdornment={renderPasswordToggle(
              "emailPassword",
              "password",
              isUpdatingEmail,
            )}
          />
          <FeedbackMessage tone="error">{emailError}</FeedbackMessage>
        </DrawerModal>
      ) : null}

      {isOtpModalOpen ? (
        <DrawerModal
          title="Enter OTP"
          onClose={() => {
            if (isVerifyingOtp) return;
            setIsOtpModalOpen(false);
            setOtpError("");
            setOtpModalDetails(DEFAULT_OTP_MODAL);
          }}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  if (isVerifyingOtp) return;
                  setIsOtpModalOpen(false);
                  setOtpError("");
                  setOtpModalDetails(DEFAULT_OTP_MODAL);
                }}
                className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-4 py-2.5 font-inter text-[0.8125rem] font-semibold text-[#475467] transition-colors hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp}
                className={ACCOUNT_PRIMARY_BUTTON_CLASS}
              >
                {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
              </button>
            </>
          }
        >
          <p className="font-inter text-[0.875rem] leading-6 text-[#475467]">
            Enter the OTP sent to{" "}
            <span className="font-semibold text-[#101828]">
              {emailModalDetails.newEmail || "your new email"}
            </span>
            .
          </p>
          <AccountField
            label="OTP"
            value={otpModalDetails.otp}
            onChange={updateOtpModalField("otp")}
            placeholder="Enter OTP"
          />
          <FeedbackMessage tone="error">{otpError}</FeedbackMessage>
        </DrawerModal>
      ) : null}
    </>
  );
}

export default AccountDrawer;
