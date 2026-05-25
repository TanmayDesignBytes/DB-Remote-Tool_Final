import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Search,
  X,
} from "lucide-react";
import {
  getUserInfo,
  logoutUser,
  sendEmailOtp,
  updateProfile,
  verifyEmailOtp,
} from "../lib/api.js";
import {
  broadcastProfileUpdate,
  clearStoredAuth,
  DEFAULT_USER_PROFILE,
  normalizeUserProfile,
  PROFILE_UPDATED_EVENT,
  readStoredUserProfile,
} from "../lib/auth.js";

const SEARCH_BUTTON_SIZE_REM = 2.5;
const SEARCH_EXPANDED_WIDTH_REM = 15.625;
const DEFAULT_NAME_MODAL = {
  name: "",
  currentPassword: "",
};
const DEFAULT_EMAIL_MODAL = {
  newEmail: "",
  currentPassword: "",
};
const DEFAULT_OTP_MODAL = {
  otp: "",
};
const DEFAULT_PASSWORD_MODAL = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};
const DEFAULT_PASSWORD_VISIBILITY = {
  namePassword: false,
  emailPassword: false,
  currentPassword: false,
  newPassword: false,
  confirmPassword: false,
};
const ACCOUNT_PRIMARY_BUTTON_CLASS =
  "rounded-[0.75rem] border border-[#356FE8] bg-[linear-gradient(90deg,#3973EE_0%,#356FE8_55%,#2F67E0_100%)] px-4 py-2.5 font-inter text-[0.8125rem] font-semibold text-white shadow-input transition-all duration-200 hover:border-[#5F8EF5] hover:bg-[linear-gradient(90deg,#5488FA_0%,#3C76F2_42%,#2C64DF_100%)] hover:shadow-[0_0.625rem_1.375rem_rgba(41,112,255,0.2),0_0_0_0.0625rem_rgba(95,142,245,0.55)] disabled:cursor-not-allowed disabled:opacity-80";

function AvatarFace({ userProfile, className = "" }) {
  const profileImage =
    userProfile.profileImage || userProfile.avatarUrl || userProfile.photoUrl || "";
  const firstLetter = (userProfile.firstLetter || userProfile.username || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={userProfile.username || "User avatar"}
        className={className}
      />
    );
  }

  return (
    <div
      aria-label={userProfile.username || "User avatar"}
      className={[
        "flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#2970FF_0%,#6AA4FF_100%)] font-inter font-bold text-white",
        className,
      ].join(" ")}
    >
      {firstLetter}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-[0.875rem] w-[0.875rem]"
    >
      <path
        d="M1.16675 4.49266C1.16675 3.62224 1.87236 2.91663 2.74279 2.91663C3.19504 2.91663 3.59655 2.62723 3.73956 2.19819L3.79175 2.04163C3.81636 1.96779 3.82866 1.93088 3.84183 1.89813C4.00994 1.47995 4.40389 1.19601 4.85377 1.16876C4.889 1.16663 4.92792 1.16663 5.00575 1.16663H8.99442C9.07225 1.16663 9.11116 1.16663 9.14639 1.16876C9.59627 1.19601 9.99022 1.47995 10.1583 1.89813C10.1715 1.93088 10.1838 1.96779 10.2084 2.04163L10.2606 2.19819C10.4036 2.62723 10.8051 2.91663 11.2574 2.91663C12.1278 2.91663 12.8334 3.62224 12.8334 4.49266V9.44996C12.8334 10.4301 12.8334 10.9201 12.6427 11.2944C12.4749 11.6237 12.2072 11.8914 11.8779 12.0592C11.5036 12.25 11.0135 12.25 10.0334 12.25H3.96675C2.98666 12.25 2.49661 12.25 2.12226 12.0592C1.79298 11.8914 1.52527 11.6237 1.35749 11.2944C1.16675 10.9201 1.16675 10.4301 1.16675 9.44996V4.49266Z"
        stroke="black"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.00008 9.62496C8.44983 9.62496 9.62508 8.44971 9.62508 6.99996C9.62508 5.55021 8.44983 4.37496 7.00008 4.37496C5.55033 4.37496 4.37508 5.55021 4.37508 6.99996C4.37508 8.44971 5.55033 9.62496 7.00008 9.62496Z"
        stroke="black"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="14"
      height="11"
      viewBox="0 0 14 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-[0.6875rem] w-[0.875rem]"
    >
      <path
        d="M11.9 0H2.1C0.91 0 0 0.794444 0 1.83333V9.16667C0 10.2056 0.91 11 2.1 11H11.9C13.09 11 14 10.2056 14 9.16667V1.83333C14 0.794444 13.09 0 11.9 0ZM11.9 1.22222C12.04 1.22222 12.11 1.28333 12.18 1.28333L7 5.86667L1.75 1.28333C1.89 1.28333 1.96 1.22222 2.1 1.22222H11.9ZM12.6 9.16667C12.6 9.53333 12.32 9.77778 11.9 9.77778H2.1C1.68 9.77778 1.4 9.53333 1.4 9.16667V2.68889L6.51 7.15C6.79 7.39444 7.21 7.39444 7.49 7.15L12.6 2.68889V9.16667Z"
        fill="#2970FF"
      />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6M6 2H5.2C4.0799 2 3.51984 2 3.09202 2.21799C2.7157 2.40973 2.40973 2.71569 2.21799 3.09202C2 3.51984 2 4.07989 2 5.2V10.8C2 11.9201 2 12.4802 2.21799 12.908C2.40973 13.2843 2.71569 13.5903 3.09202 13.782C3.51984 14 4.0799 14 5.2 14H6"
        stroke="#344054"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MyAccountIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z"
        stroke="#344054"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.83325 13.3333C2.83325 11.4003 5.14626 9.83331 7.99992 9.83331C10.8536 9.83331 13.1666 11.4003 13.1666 13.3333"
        stroke="#344054"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandableSearchButton({
  value = "",
  onChange,
  suggestions = [],
  onSuggestionSelect,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const hasValue = Boolean(String(value || "").trim());
  const hasSuggestions = isExpanded && suggestions.length > 0;

  const collapse = useCallback(() => {
    if (hasValue) {
      setIsFocused(false);
      setIsHovered(false);
      return;
    }

    setIsExpanded(false);
    setIsFocused(false);
    setIsHovered(false);
  }, [hasValue]);

  const open = useCallback(() => {
    setIsExpanded(true);
  }, []);

  useEffect(() => {
    if (hasValue) {
      setIsExpanded(true);
    }
  }, [hasValue]);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        collapse();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, [collapse, isExpanded]);

  const handleBlur = (event) => {
    const nextFocused = event.relatedTarget;
    if (!rootRef.current?.contains(nextFocused)) {
      collapse();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      collapse();
    }
  };

  const shellWidth = isExpanded
    ? SEARCH_EXPANDED_WIDTH_REM
    : isHovered
      ? SEARCH_EXPANDED_WIDTH_REM
      : SEARCH_BUTTON_SIZE_REM;
  const isFilled = String(value ?? "").trim().length > 0;

  return (
    <div
      ref={rootRef}
      className="relative h-[2.5rem] w-[2.5rem] shrink-0 overflow-visible"
      onMouseEnter={() => {
        if (!isExpanded) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (!isExpanded) {
          setIsHovered(false);
        }
      }}
    >
        <div
          className={[
            "absolute right-0 top-0 h-[2.5rem] overflow-hidden rounded-[6.25rem]",
            "border transition-[width,border-color,box-shadow] duration-300 ease-in-out",
            isFocused
              ? "border-[#bfdbfe] shadow-[0_10px_30px_rgba(15,23,42,0.10),0_0_0_4px_rgba(59,130,246,0.08)]"
              : isFilled
                ? "border-[#D5DDEB] bg-[#F8FAFC] shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)]"
                : "border-[rgba(168,168,168,0.7)] bg-white shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)]",
          ].join(" ")}
          style={{ width: `${shellWidth}rem` }}
        >
        <Search
          className={[
            "pointer-events-none absolute top-1/2 z-10 h-[1.25rem] w-[1.25rem] text-[#242425] transition-all duration-300 ease-in-out",
            isExpanded || isHovered
              ? "left-3 -translate-y-1/2"
              : "left-1/2 -translate-x-1/2 -translate-y-1/2",
          ].join(" ")}
        />

        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Search..."
          onChange={(event) => onChange?.(event.target.value)}
          onFocus={() => {
            open();
            setIsFocused(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={[
            "h-full w-full bg-transparent font-inter text-[0.875rem] text-slate-900 outline-none",
            "transition-opacity duration-200 ease-in-out placeholder:text-slate-400",
            isExpanded
              ? value
                ? "cursor-text pl-10 pr-10 opacity-100"
                : "cursor-text pl-10 pr-4 opacity-100"
              : "pointer-events-none cursor-pointer pl-10 opacity-0",
          ].join(" ")}
          aria-label="Search"
        />

        {isExpanded && value ? (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange?.("");
              window.requestAnimationFrame(() => {
                inputRef.current?.focus();
              });
            }}
            className="absolute right-3 top-1/2 z-10 flex h-[1.25rem] w-[1.25rem] -translate-y-1/2 items-center justify-center text-black"
          >
            <X className="h-[1rem] w-[1rem] stroke-[2.25]" />
          </button>
        ) : null}

        {!isExpanded ? (
          <button
            type="button"
            aria-label="Open search"
            aria-expanded={isExpanded}
            onClick={open}
            className="absolute inset-0 rounded-full"
          />
        ) : null}
      </div>

      {hasSuggestions ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-[15.625rem] overflow-hidden rounded-[0.875rem] border border-[#EAECF0] bg-white py-[0.375rem] shadow-[0_1rem_2rem_rgba(15,23,42,0.14)]">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSuggestionSelect?.(suggestion)}
              className="flex w-full flex-col items-start gap-[0.125rem] px-[0.875rem] py-[0.625rem] text-left transition-colors hover:bg-[#F4F7FE]"
            >
              <span className="font-inter text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-[#2970FF]">
                {suggestion.kicker}
              </span>
              <span className="max-w-full truncate font-inter text-[0.875rem] font-semibold text-[#101828]">
                {suggestion.title}
              </span>
              {suggestion.description ? (
                <span className="max-w-full truncate font-inter text-[0.75rem] font-medium text-[#667085]">
                  {suggestion.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AccountActionModal({ title, description, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[rgba(15,23,42,0.36)] p-4 backdrop-blur-[0.125rem]">
      <div className="w-full max-w-[30rem] overflow-hidden rounded-[1rem] bg-white shadow-[0_1.5625rem_3.125rem_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between border-b border-[#EAECF0] px-[1.25rem] py-[1rem]">
          <div className="min-w-0">
            <h3 className="font-inter text-[1rem] font-semibold text-[#101828]">
              {title}
            </h3>
            {description ? (
              <p className="mt-[0.25rem] font-inter text-[0.8125rem] leading-5 text-[#667085]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#475467] transition-colors hover:bg-[#F2F4F7]"
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

function AccountModalField({
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
            "h-[2.875rem] w-full rounded-[0.75rem] border px-[0.875rem] font-inter text-[0.9375rem] text-[#101828] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[#98A2B3] focus:border-[#84ADFF] focus:ring-2 focus:ring-[#2970FF]/20 disabled:bg-[#F8FAFC] disabled:text-[#98A2B3]",
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

function AccountFeedback({ children }) {
  if (!children) {
    return null;
  }

  return (
    <div className="rounded-[0.75rem] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 font-inter text-[0.8125rem] leading-5 text-[#B42318]">
      {children}
    </div>
  );
}

function AccountSuccessToast({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-[5.25rem] z-[1500] flex min-h-[3rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-[0.875rem] border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 font-inter text-[0.875rem] font-semibold text-[#027A48] shadow-[0_1rem_2rem_rgba(15,23,42,0.16)]"
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#12B76A]" />
      <span>{message}</span>
    </div>
  );
}

function ProfileEditButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#667085] transition-colors hover:bg-[#F2F4F7] hover:text-[#2970FF]"
      aria-label={label}
    >
      <Pencil className="h-[0.875rem] w-[0.875rem]" />
    </button>
  );
}

function ProfileMenu({
  userProfile,
  onEditName,
  onEditEmail,
  onChangePassword,
  onSignOut,
}) {
  return (
    <div className="absolute right-0 top-full z-[60] -mt-[0.4375rem] flex w-[16.5rem] flex-col overflow-hidden rounded-[1rem] border border-[#e5e7eb] bg-white shadow-[0_1.5625rem_3.125rem_rgba(0,0,0,0.15),0_0.625rem_1.25rem_rgba(0,0,0,0.1)]">
      <div className="flex h-[5.875rem] w-full shrink-0 flex-col items-start border-b border-[#e5e7eb] bg-gradient-to-r from-[#ede9fe] to-[#e0e7ff] px-4 py-3">
        <div className="flex h-full w-[12.6875rem] flex-1 items-center justify-center gap-3 self-center">
          <div className="relative flex h-[4.0625rem] w-[4.0625rem] items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[0.046875rem] border-[rgba(3,15,14,0.08)] opacity-[0.08]" />
            <AvatarFace
              userProfile={userProfile}
              className="h-full w-full rounded-full object-cover text-[1.75rem] shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.15)]"
            />
            <button
              type="button"
              className="absolute bottom-0 right-0 flex h-[1.3125rem] w-[1.3125rem] items-center justify-center rounded-full bg-white shadow-[0_0.125rem_0.5rem_rgba(0,0,0,0.1)] transition-transform hover:scale-110"
              aria-label="Change profile photo"
            >
              <CameraIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-start bg-white">
        <div className="flex min-h-[6.25rem] self-stretch flex-col items-center gap-[1.125rem] border-b border-[#eaecf0] px-4 py-5">
          <div className="flex w-full flex-col items-start px-4">
            <div className="flex w-full items-center gap-2">
              <div className="min-w-0 flex-1 truncate font-['Satoshi'] text-[0.875rem] font-bold leading-5 text-[#475467]">
                {userProfile.username}
              </div>
              <ProfileEditButton label="Edit name" onClick={onEditName} />
            </div>

            <div className="mt-[0.625rem] flex items-center gap-[0.3125rem] self-stretch">
              <div className="flex h-5 w-5 shrink-0 items-start rounded-full bg-[rgba(19,90,83,0.06)] p-[0.25rem_0.1875rem]">
                <MailIcon />
              </div>
              <div className="min-w-0 flex-1 truncate whitespace-nowrap font-['Satoshi'] text-[0.875rem] font-normal leading-5 text-[#475467]">
                {userProfile.email}
              </div>
              <ProfileEditButton label="Edit email" onClick={onEditEmail} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onChangePassword}
          className="flex min-h-[3.375rem] self-stretch items-center border-b border-[#eaecf0] bg-white px-4 py-1 text-left transition-all duration-200 hover:bg-[#f9fafb]"
        >
          <div className="flex flex-1 items-center gap-2 py-[0.125rem] pr-[0.375rem] pl-4">
            <KeyRound className="h-4 w-4 text-[#344054]" />
            <div className="flex-1 font-inter text-[0.875rem] font-medium leading-5 text-[#344054] transition-colors duration-200">
              Change Password
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="flex min-h-[3.375rem] self-stretch items-center bg-white px-4 py-1 text-left transition-all duration-200 hover:bg-[#f9fafb]"
        >
          <div className="flex flex-1 items-center gap-2 py-[0.125rem] pr-[0.375rem] pl-4">
            <LogOutIcon />
            <div className="flex-1 font-inter text-[0.875rem] font-medium leading-5 text-[#344054] transition-colors duration-200">
              Log out
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function Header({
  searchValue = "",
  onSearchChange,
  searchSuggestions = [],
  onSearchSuggestionSelect,
}) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(
    () => readStoredUserProfile() || DEFAULT_USER_PROFILE,
  );
  const [activeAccountModal, setActiveAccountModal] = useState(null);
  const [nameModalDetails, setNameModalDetails] = useState(DEFAULT_NAME_MODAL);
  const [emailModalDetails, setEmailModalDetails] =
    useState(DEFAULT_EMAIL_MODAL);
  const [otpModalDetails, setOtpModalDetails] = useState(DEFAULT_OTP_MODAL);
  const [passwordModalDetails, setPasswordModalDetails] = useState(
    DEFAULT_PASSWORD_MODAL,
  );
  const [visiblePasswordFields, setVisiblePasswordFields] = useState(
    DEFAULT_PASSWORD_VISIBILITY,
  );
  const [accountActionError, setAccountActionError] = useState("");
  const [accountActionSuccess, setAccountActionSuccess] = useState("");
  const [isSubmittingAccountAction, setIsSubmittingAccountAction] =
    useState(false);
  const profileMenuRef = useRef(null);
  const accountSuccessTimeoutRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    return () => {
      if (accountSuccessTimeoutRef.current) {
        window.clearTimeout(accountSuccessTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const storedProfile = readStoredUserProfile();

    if (storedProfile) {
      setUserProfile(storedProfile);
    }

    const loadUserProfile = async () => {
      try {
        const response = await getUserInfo();
        const profile = normalizeUserProfile(response, storedProfile);

        if (!isMounted) {
          return;
        }

        setUserProfile(profile);
        broadcastProfileUpdate(profile);
      } catch {
        // Keep placeholder/stored profile when token or backend is unavailable.
      }
    };

    void loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const nextProfile = event.detail;

      if (nextProfile && typeof nextProfile === "object") {
        setUserProfile((current) => ({
          ...current,
          ...nextProfile,
        }));
      }
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    return () =>
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
  }, []);

  const handleInvalidSession = (error) => {
    const message = String(error?.message || "").toLowerCase();
    const isInvalidSession =
      error?.status === 401 ||
      message.includes("invalid token") ||
      message.includes("not authorized");

    if (!isInvalidSession) {
      return false;
    }

    clearStoredAuth();
    setProfileOpen(false);
    setActiveAccountModal(null);
    navigate("/", { replace: true });
    return true;
  };

  const closeAccountModal = ({ force = false } = {}) => {
    if (isSubmittingAccountAction && !force) {
      return;
    }

    setActiveAccountModal(null);
    setAccountActionError("");
    setNameModalDetails(DEFAULT_NAME_MODAL);
    setEmailModalDetails(DEFAULT_EMAIL_MODAL);
    setOtpModalDetails(DEFAULT_OTP_MODAL);
    setPasswordModalDetails(DEFAULT_PASSWORD_MODAL);
    setVisiblePasswordFields(DEFAULT_PASSWORD_VISIBILITY);
  };

  const showSuccessAndReturnToDashboard = (message) => {
    if (accountSuccessTimeoutRef.current) {
      window.clearTimeout(accountSuccessTimeoutRef.current);
    }

    closeAccountModal({ force: true });
    setProfileOpen(false);
    setAccountActionSuccess(message);

    accountSuccessTimeoutRef.current = window.setTimeout(() => {
      setAccountActionSuccess("");
      accountSuccessTimeoutRef.current = null;
      navigate("/dashboard", { replace: true });
    }, 2000);
  };

  const openAccountModal = (modalName) => {
    setProfileOpen(false);
    setAccountActionError("");
    setAccountActionSuccess("");
    setVisiblePasswordFields(DEFAULT_PASSWORD_VISIBILITY);

    if (modalName === "name") {
      setNameModalDetails({
        name: userProfile.username || "",
        currentPassword: "",
      });
    }

    if (modalName === "email") {
      setEmailModalDetails(DEFAULT_EMAIL_MODAL);
      setOtpModalDetails(DEFAULT_OTP_MODAL);
    }

    if (modalName === "password") {
      setPasswordModalDetails(DEFAULT_PASSWORD_MODAL);
    }

    setActiveAccountModal(modalName);
  };

  const updateProfileLocally = (profilePatch) => {
    const nextProfile = normalizeUserProfile(
      {
        data: {
          ...userProfile,
          ...profilePatch,
        },
      },
      userProfile,
    );

    setUserProfile(nextProfile);
    broadcastProfileUpdate(nextProfile);
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswordFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const renderPasswordToggle = (field, label) => {
    const isVisible = visiblePasswordFields[field];

    return (
      <button
        type="button"
        onClick={() => togglePasswordVisibility(field)}
        onMouseDown={(event) => event.preventDefault()}
        aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#667085] transition-colors hover:bg-[#F2F4F7] hover:text-[#101828]"
      >
        {isVisible ? (
          <EyeOff className="h-[1.0625rem] w-[1.0625rem]" />
        ) : (
          <Eye className="h-[1.0625rem] w-[1.0625rem]" />
        )}
      </button>
    );
  };

  const handleNameUpdate = async () => {
    const nextName = nameModalDetails.name.trim();
    const currentPassword = nameModalDetails.currentPassword.trim();

    if (!nextName || !currentPassword) {
      setAccountActionError("Enter your name and current password.");
      return;
    }

    setIsSubmittingAccountAction(true);
    setAccountActionError("");

    try {
      await updateProfile({
        currentPassword,
        newPassword: "",
        confirmNewPassword: "",
        newName: nextName,
      });
      updateProfileLocally({ username: nextName });
      showSuccessAndReturnToDashboard("Your name was updated successfully.");
    } catch (error) {
      if (handleInvalidSession(error)) {
        return;
      }

      setAccountActionError(error?.message || "Unable to update name right now.");
    } finally {
      setIsSubmittingAccountAction(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const nextEmail = emailModalDetails.newEmail.trim();
    const currentPassword = emailModalDetails.currentPassword.trim();

    if (!nextEmail || !currentPassword) {
      setAccountActionError("Enter the new email and current password.");
      return;
    }

    setIsSubmittingAccountAction(true);
    setAccountActionError("");

    try {
      await sendEmailOtp({
        newEmail: nextEmail,
        currentPassword,
      });
      setActiveAccountModal("email-otp");
      setVisiblePasswordFields((current) => ({
        ...current,
        emailPassword: false,
      }));
    } catch (error) {
      if (handleInvalidSession(error)) {
        return;
      }

      setAccountActionError(error?.message || "Unable to send OTP right now.");
    } finally {
      setIsSubmittingAccountAction(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const otp = otpModalDetails.otp.trim();

    if (!otp) {
      setAccountActionError("Enter the OTP to continue.");
      return;
    }

    setIsSubmittingAccountAction(true);
    setAccountActionError("");

    try {
      const response = await verifyEmailOtp({ otp });
      const nextEmail =
        response?.data?.email ||
        emailModalDetails.newEmail.trim() ||
        userProfile.email;

      updateProfileLocally({ email: nextEmail });
      showSuccessAndReturnToDashboard("Your email was changed successfully.");
    } catch (error) {
      if (handleInvalidSession(error)) {
        return;
      }

      setAccountActionError(error?.message || "Unable to verify OTP right now.");
    } finally {
      setIsSubmittingAccountAction(false);
    }
  };

  const handlePasswordUpdate = async () => {
    const currentPassword = passwordModalDetails.currentPassword.trim();
    const newPassword = passwordModalDetails.newPassword.trim();
    const confirmPassword = passwordModalDetails.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setAccountActionError("Fill all password fields to continue.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setAccountActionError("New password and confirmation do not match.");
      return;
    }

    setIsSubmittingAccountAction(true);
    setAccountActionError("");

    try {
      await updateProfile({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
        newName: userProfile.username,
      });
      showSuccessAndReturnToDashboard("Your password was updated successfully.");
    } catch (error) {
      if (handleInvalidSession(error)) {
        return;
      }

      setAccountActionError(
        error?.message || "Unable to update password right now.",
      );
    } finally {
      setIsSubmittingAccountAction(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch {
      // Always clear local auth so sign-out still completes.
    } finally {
      clearStoredAuth();
      setProfileOpen(false);
      navigate("/");
    }
  };

  return (
    <>
      <AccountSuccessToast message={accountActionSuccess} />

      <header className="absolute left-0 right-0 top-0 z-10 flex h-[4.25rem] w-full items-start justify-between pl-[1.5rem] pr-[1.5rem] pt-[1.125rem]">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="h-[1.9135rem] w-[14.625rem] transition-opacity hover:opacity-85"
        aria-label="Go to dashboard"
      >
        <img
          src="/assets/DB_Logo2.png"
          alt="Design Bytes"
          className="h-full w-full object-contain object-left"
        />
      </button>

      <div className="inline-flex items-start justify-end gap-[1.25rem]">
        <ExpandableSearchButton
          value={searchValue}
          onChange={onSearchChange}
          suggestions={searchSuggestions}
          onSuggestionSelect={onSearchSuggestionSelect}
        />

        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            aria-label="Open profile menu"
            className="block h-[2.5rem] w-[2.5rem] rounded-[12.5rem]"
          >
            <AvatarFace
              userProfile={userProfile}
              className="h-[2.5rem] w-[2.5rem] rounded-[12.5rem] object-cover text-[1rem]"
            />
          </button>

          {profileOpen ? (
            <ProfileMenu
              userProfile={userProfile}
              onEditName={() => openAccountModal("name")}
              onEditEmail={() => openAccountModal("email")}
              onChangePassword={() => openAccountModal("password")}
              onSignOut={handleSignOut}
            />
          ) : null}
        </div>
      </div>
      </header>

      {activeAccountModal === "name" ? (
        <AccountActionModal
          title="Change name"
          description="Update the display name shown across the dashboard. Current password is required to confirm this change."
          onClose={closeAccountModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeAccountModal}
                className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-4 py-2.5 font-inter text-[0.8125rem] font-semibold text-[#475467] transition-colors hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNameUpdate}
                disabled={isSubmittingAccountAction}
                className={ACCOUNT_PRIMARY_BUTTON_CLASS}
              >
                {isSubmittingAccountAction ? "Saving..." : "Save Name"}
              </button>
            </>
          }
        >
          <AccountModalField
            label="Name"
            value={nameModalDetails.name}
            onChange={(event) =>
              setNameModalDetails((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="Enter your name"
          />
          <AccountModalField
            label="Current password"
            type={visiblePasswordFields.namePassword ? "text" : "password"}
            value={nameModalDetails.currentPassword}
            onChange={(event) =>
              setNameModalDetails((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
            placeholder="Enter current password"
            trailingAdornment={renderPasswordToggle(
              "namePassword",
              "current password",
            )}
          />
          <AccountFeedback>{accountActionError}</AccountFeedback>
        </AccountActionModal>
      ) : null}

      {activeAccountModal === "email" ? (
        <AccountActionModal
          title="Change email"
          description="Enter your new email and current password. We will send an OTP before saving it."
          onClose={closeAccountModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeAccountModal}
                className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-4 py-2.5 font-inter text-[0.8125rem] font-semibold text-[#475467] transition-colors hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendEmailOtp}
                disabled={isSubmittingAccountAction}
                className={ACCOUNT_PRIMARY_BUTTON_CLASS}
              >
                {isSubmittingAccountAction ? "Sending..." : "Send OTP"}
              </button>
            </>
          }
        >
          <AccountModalField
            label="Current email"
            value={userProfile.email}
            disabled
          />
          <AccountModalField
            label="New email"
            value={emailModalDetails.newEmail}
            onChange={(event) =>
              setEmailModalDetails((current) => ({
                ...current,
                newEmail: event.target.value,
              }))
            }
            placeholder="Enter your new email"
          />
          <AccountModalField
            label="Current password"
            type={visiblePasswordFields.emailPassword ? "text" : "password"}
            value={emailModalDetails.currentPassword}
            onChange={(event) =>
              setEmailModalDetails((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
            placeholder="Enter current password"
            trailingAdornment={renderPasswordToggle(
              "emailPassword",
              "current password",
            )}
          />
          <AccountFeedback>{accountActionError}</AccountFeedback>
        </AccountActionModal>
      ) : null}

      {activeAccountModal === "email-otp" ? (
        <AccountActionModal
          title="Verify email"
          description={`Enter the OTP sent to ${
            emailModalDetails.newEmail || "your new email"
          }.`}
          onClose={closeAccountModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeAccountModal}
                className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-4 py-2.5 font-inter text-[0.8125rem] font-semibold text-[#475467] transition-colors hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyEmailOtp}
                disabled={isSubmittingAccountAction}
                className={ACCOUNT_PRIMARY_BUTTON_CLASS}
              >
                {isSubmittingAccountAction ? "Verifying..." : "Verify OTP"}
              </button>
            </>
          }
        >
          <AccountModalField
            label="OTP"
            value={otpModalDetails.otp}
            onChange={(event) => setOtpModalDetails({ otp: event.target.value })}
            placeholder="Enter OTP"
          />
          <AccountFeedback>{accountActionError}</AccountFeedback>
        </AccountActionModal>
      ) : null}

      {activeAccountModal === "password" ? (
        <AccountActionModal
          title="Change password"
          description="Current password, new password, and confirmation are required."
          onClose={closeAccountModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeAccountModal}
                className="rounded-[0.75rem] border border-[#D0D5DD] bg-white px-4 py-2.5 font-inter text-[0.8125rem] font-semibold text-[#475467] transition-colors hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasswordUpdate}
                disabled={isSubmittingAccountAction}
                className={ACCOUNT_PRIMARY_BUTTON_CLASS}
              >
                {isSubmittingAccountAction ? "Updating..." : "Update Password"}
              </button>
            </>
          }
        >
          <AccountModalField
            label="Current password"
            type={visiblePasswordFields.currentPassword ? "text" : "password"}
            value={passwordModalDetails.currentPassword}
            onChange={(event) =>
              setPasswordModalDetails((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
            placeholder="Enter current password"
            trailingAdornment={renderPasswordToggle(
              "currentPassword",
              "current password",
            )}
          />
          <AccountModalField
            label="New password"
            type={visiblePasswordFields.newPassword ? "text" : "password"}
            value={passwordModalDetails.newPassword}
            onChange={(event) =>
              setPasswordModalDetails((current) => ({
                ...current,
                newPassword: event.target.value,
              }))
            }
            placeholder="Enter new password"
            trailingAdornment={renderPasswordToggle(
              "newPassword",
              "new password",
            )}
          />
          <AccountModalField
            label="Retype new password"
            type={visiblePasswordFields.confirmPassword ? "text" : "password"}
            value={passwordModalDetails.confirmPassword}
            onChange={(event) =>
              setPasswordModalDetails((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            placeholder="Confirm new password"
            trailingAdornment={renderPasswordToggle(
              "confirmPassword",
              "retyped new password",
            )}
          />
          <AccountFeedback>{accountActionError}</AccountFeedback>
        </AccountActionModal>
      ) : null}
    </>
  );
}

export default Header;
