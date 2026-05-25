import React, { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import {
  broadcastProfileUpdate,
  readStoredUserProfile,
} from "../lib/auth.js";
import {
  getUserInfo,
  sendEmailOtp,
  updateProfile,
  verifyEmailOtp,
} from "../lib/api.js";

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

const ACCOUNT_PRIMARY_BUTTON_CLASS =
  "rounded-[0.75rem] border border-[#356FE8] bg-[linear-gradient(90deg,#3973EE_0%,#356FE8_55%,#2F67E0_100%)] px-5 py-3 font-inter text-[0.875rem] font-semibold text-white shadow-input transition-all duration-200 hover:border-[#5F8EF5] hover:bg-[linear-gradient(90deg,#5488FA_0%,#3C76F2_42%,#2C64DF_100%)] hover:shadow-[0_0.625rem_1.375rem_rgba(41,112,255,0.2),0_0_0_0.0625rem_rgba(95,142,245,0.55)] disabled:cursor-not-allowed disabled:opacity-80";

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

function AccountField({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isFilled = String(value ?? "").trim().length > 0;

  return (
    <label className="grid gap-[0.75rem] md:grid-cols-[11.875rem_minmax(0,1fr)] md:items-center">
      <span className="font-inter text-[0.875rem] font-medium leading-5 text-[#475467]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`h-[3rem] rounded-[0.75rem] border px-[1rem] font-inter text-[0.9375rem] text-[#101828] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[#98A2B3] focus:border-[#84ADFF] focus:ring-2 focus:ring-[#2970FF]/20 disabled:bg-[#F8FAFC] disabled:text-[#98A2B3] ${
          isFilled && !isFocused
            ? "border-[#D5DDEB] bg-[#F8FAFC]"
            : "border-[#D0D5DD] bg-white"
        }`}
      />
    </label>
  );
}

function ModalShell({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,23,42,0.36)] p-4 backdrop-blur-[0.125rem]">
      <div className="w-full max-w-[35rem] overflow-hidden rounded-[1rem] bg-white shadow-[0_1.5625rem_3.125rem_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between border-b border-[#EAECF0] px-[1.5rem] py-[1rem]">
          <h3 className="font-inter text-[1.125rem] font-semibold text-[#101828]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#475467] transition-colors hover:bg-[#F2F4F7]"
            aria-label={`Close ${title}`}
          >
            <span className="text-[1.375rem] leading-none">&times;</span>
          </button>
        </div>

        {children}

        <div className="flex justify-end gap-3 border-t border-[#EAECF0] px-[1.5rem] py-[1rem]">
          {footer}
        </div>
      </div>
    </div>
  );
}

function AccountPage() {
  const storedProfile = useMemo(() => readStoredUserProfile(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountDetails, setAccountDetails] = useState(() => ({
    ...DEFAULT_ACCOUNT,
    email: storedProfile?.email || "",
    username: storedProfile?.username || "",
  }));
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [emailModalDetails, setEmailModalDetails] = useState(DEFAULT_EMAIL_MODAL);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpModalDetails, setOtpModalDetails] = useState(DEFAULT_OTP_MODAL);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAccount = async () => {
      try {
        const response = await getUserInfo();
        const profile = normalizeProfile(response, storedProfile);

        if (!isMounted) {
          return;
        }

        setAccountDetails((current) => ({
          ...current,
          email: profile.email,
          username: profile.username,
        }));
        broadcastProfileUpdate(profile);
      } catch {
        // Keep stored profile fallback only.
      }
    };

    void loadAccount();

    return () => {
      isMounted = false;
    };
  }, [storedProfile]);

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
        currentPassword: accountDetails.currentPassword,
        newPassword: accountDetails.newPassword,
        confirmNewPassword: accountDetails.confirmPassword,
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
      setProfileSuccess("Profile updated successfully.");
    } catch (error) {
      setProfileError(error?.message || "Unable to update profile right now.");
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
      setOtpError("");
      setIsOtpModalOpen(true);
    } catch (error) {
      setEmailError(error?.message || "Unable to update email right now.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    setIsVerifyingOtp(true);

    try {
      const response = await verifyEmailOtp({
        otp: otpModalDetails.otp,
      });

      const nextEmail =
        response?.data?.email || emailModalDetails.newEmail || accountDetails.email;

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
      setOtpModalDetails(DEFAULT_OTP_MODAL);
      setEmailModalDetails(DEFAULT_EMAIL_MODAL);
    } catch (error) {
      setOtpError(error?.message || "Unable to verify OTP right now.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <AppShell
      activeTab="dashboard"
      onTabChange={() => {}}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="h-full overflow-auto px-[2.6875rem] pb-[2rem] pt-[1.5rem]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-inter text-[1.375rem] font-semibold text-[#101828]">
              My Account
            </h1>
            <p className="mt-[0.25rem] font-inter text-[0.875rem] text-[#667085]">
              Manage your profile and credential details in one place.
            </p>
          </div>
        </div>

        <div className="mt-[1.53125rem] h-px w-full bg-[#ECECEC]" />

        <div className="max-w-[49rem] py-[2rem]">
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
            <AccountField
              label="Current password"
              type="password"
              value={accountDetails.currentPassword}
              onChange={updateField("currentPassword")}
              placeholder="Enter current password"
            />
            <AccountField
              label="New password"
              type="password"
              value={accountDetails.newPassword}
              onChange={updateField("newPassword")}
              placeholder="Enter new password"
            />
            <AccountField
              label="Retype new password"
              type="password"
              value={accountDetails.confirmPassword}
              onChange={updateField("confirmPassword")}
              placeholder="Confirm new password"
            />
          </div>

          {profileError ? (
            <div className="mt-5 rounded-[0.75rem] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 font-inter text-[0.875rem] text-[#B42318]">
              {profileError}
            </div>
          ) : null}

          {profileSuccess ? (
            <div className="mt-5 rounded-[0.75rem] border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 font-inter text-[0.875rem] text-[#067647]">
              {profileSuccess}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEmailError("");
                setOtpError("");
                setEmailModalDetails(DEFAULT_EMAIL_MODAL);
                setOtpModalDetails(DEFAULT_OTP_MODAL);
                setIsOtpModalOpen(false);
                setIsChangeEmailOpen(true);
              }}
              className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-5 py-3 font-inter text-[0.875rem] font-semibold text-[#475467] transition-colors hover:bg-[#F8FAFC]"
            >
              Change Email
            </button>
            <button
              type="button"
              onClick={handleUpdateCredentials}
              disabled={isUpdatingProfile}
              className={ACCOUNT_PRIMARY_BUTTON_CLASS}
            >
              {isUpdatingProfile ? "Updating..." : "Update Credentials"}
            </button>
          </div>
        </div>
      </div>

      {isChangeEmailOpen ? (
        <ModalShell
          title="Change email"
          onClose={() => {
            if (isUpdatingEmail) return;
            setIsChangeEmailOpen(false);
            setEmailError("");
            setEmailModalDetails(DEFAULT_EMAIL_MODAL);
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
                }}
                className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-5 py-3 font-inter text-[0.875rem] font-semibold text-[#475467] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="grid gap-4 px-[1.5rem] py-[1.25rem]">
            <AccountField
              label="New email"
              value={emailModalDetails.newEmail}
              onChange={updateEmailModalField("newEmail")}
              placeholder="Enter your new email"
            />
            <AccountField
              label="Password"
              type="password"
              value={emailModalDetails.currentPassword}
              onChange={updateEmailModalField("currentPassword")}
              placeholder="Enter current password"
            />
            {emailError ? (
              <div className="rounded-[0.75rem] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 font-inter text-[0.875rem] text-[#B42318]">
                {emailError}
              </div>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {isOtpModalOpen ? (
        <ModalShell
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
                className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-5 py-3 font-inter text-[0.875rem] font-semibold text-[#475467] transition-colors hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp}
                className="rounded-[0.75rem] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] px-5 py-3 font-inter text-[0.875rem] font-semibold text-white shadow-[0_0.5rem_1.125rem_rgba(41,112,255,0.28)] transition-transform hover:translate-y-[-0.0625rem]"
              >
                {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
              </button>
            </>
          }
        >
          <div className="grid gap-4 px-[1.5rem] py-[1.25rem]">
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
            {otpError ? (
              <div className="rounded-[0.75rem] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 font-inter text-[0.875rem] text-[#B42318]">
                {otpError}
              </div>
            ) : null}
          </div>
        </ModalShell>
      ) : null}
    </AppShell>
  );
}

export default AccountPage;
