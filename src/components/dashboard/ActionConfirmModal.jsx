import React, { useEffect } from "react";

function ActionConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  isSubmitting = false,
  errorMessage = "",
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[1000] bg-black/35 backdrop-blur-[0.125rem]"
        onClick={() => {
          if (!isSubmitting) {
            onClose?.();
          }
        }}
      />
      <div className="fixed inset-0 z-[1001] flex items-center justify-center px-4 py-6">
        <div
          className="w-[min(90vw,30rem)] rounded-[1.125rem] bg-white px-8 py-9 shadow-[0_1.5rem_4rem_rgba(15,23,42,0.18)]"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="font-inter text-[1.375rem] font-semibold leading-[1.2] text-[#1F2937]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="mt-0.5 text-[1.5rem] leading-none text-[#94A3B8] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>

          <p className="mb-7 font-inter text-[1rem] font-medium leading-7 text-[#667085]">
            {message}
          </p>

          {errorMessage ? (
            <div className="mb-6 rounded-[0.625rem] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-[0.8125rem] font-medium text-[#B42318]">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-[0.75rem] border border-[#D0D5DD] bg-[#F9FAFB] px-6 py-3 font-inter text-[0.875rem] font-semibold text-[#667085] transition-colors hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="min-w-[6rem] rounded-[0.75rem] bg-[#2855CB] px-6 py-3 font-inter text-[0.875rem] font-semibold text-white transition-colors hover:bg-[#234AB2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ActionConfirmModal;
