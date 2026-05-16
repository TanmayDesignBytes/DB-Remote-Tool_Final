import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const EMPTY_VALUES = {
  name: "",
  description: "",
};

function Field({ label, children, errorMessage = "" }) {
  return (
    <label className="flex w-full flex-col gap-[0.375rem] self-stretch">
      <span className="font-poppins text-[0.875rem] font-normal leading-[1.25rem] text-[#344054]">
        {label}
      </span>
      {children}
      {errorMessage ? (
        <span className="font-inter text-[0.75rem] font-medium leading-[1.125rem] text-[#D92D20]">
          {errorMessage}
        </span>
      ) : null}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  ariaInvalid = false,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isFilled = String(value ?? "").trim().length > 0;

  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      aria-invalid={ariaInvalid}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={`h-[3.4375rem] w-full rounded-[0.5rem] border px-[0.875rem] py-[0.625rem] font-inter text-[1rem] font-normal leading-[1.5rem] text-[#344054] shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[#667085] focus:ring-2 focus:ring-[#2970FF]/20 disabled:cursor-not-allowed disabled:opacity-60 ${
        isFilled && !isFocused
          ? "border-[#D5DDEB] bg-[#F8FAFC]"
          : "border-[#D0D5DD] bg-white"
      }`}
    />
  );
}

function AddGroupModal({
  open,
  onClose,
  onConfirm,
  initialValues = EMPTY_VALUES,
  isSubmitting = false,
  errorMessage = "",
}) {
  const [formValues, setFormValues] = useState(EMPTY_VALUES);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    setFormValues({
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
    });
    setFormErrors({});

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
  }, [initialValues, isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  const handleChange = (field) => (event) => {
    const { value } = event.target;

    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => {
      if (!current[field] || !String(value).trim()) {
        return current;
      }

      const { [field]: _removed, ...rest } = current;
      return rest;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const requiredErrors = {
      ...(!formValues.name.trim()
        ? { name: "Group name is required." }
        : {}),
      ...(!formValues.description.trim()
        ? { description: "Description is required." }
        : {}),
    };

    if (Object.keys(requiredErrors).length > 0) {
      setFormErrors(requiredErrors);
      return;
    }

    onConfirm?.({
      ...formValues,
      name: formValues.name.trim(),
      description: formValues.description.trim(),
    });
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-[0.125rem]"
        onClick={() => {
          if (!isSubmitting) {
            onClose?.();
          }
        }}
      />

      <div className="fixed inset-0 z-[1001] flex items-center justify-center px-4 py-6">
        <div
          className="flex w-[32.125rem] max-w-[80rem] flex-col gap-[2rem] overflow-hidden rounded-[1.25rem] bg-white p-[3.125rem] shadow-[0_0.25rem_0.25rem_0_rgba(0,0,0,0.25)] backdrop-blur-[0.40625rem]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-group-title"
          onClick={(event) => event.stopPropagation()}
        >
          <h2
            id="add-group-title"
            className="font-poppins text-[1.25rem] font-semibold leading-[1.875rem] text-[#101828]"
          >
            Add Group
          </h2>

          <form
            className="flex flex-col gap-[4.75rem]"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="flex flex-col gap-[1.25rem]">
              <Field label="Group Name" errorMessage={formErrors.name}>
                <TextInput
                  value={formValues.name}
                  onChange={handleChange("name")}
                  placeholder="Enter Group Name"
                  disabled={isSubmitting}
                  required
                  ariaInvalid={Boolean(formErrors.name)}
                />
              </Field>

              <Field label="Description" errorMessage={formErrors.description}>
                <TextInput
                  value={formValues.description}
                  onChange={handleChange("description")}
                  placeholder="Enter Description"
                  disabled={isSubmitting}
                  required
                  ariaInvalid={Boolean(formErrors.description)}
                />
              </Field>

              {errorMessage ? (
                <div className="rounded-[0.75rem] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 font-inter text-[0.875rem] font-medium leading-5 text-[#B42318]">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex h-[2.75rem] w-[10.5625rem] items-center justify-center gap-[0.375rem] rounded-[6.25rem] border border-[#33363F] bg-white px-[1rem] py-[0.625rem] font-inter text-[1rem] font-semibold leading-[1.5rem] text-[#33363F] shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-[2.75rem] w-[10.5625rem] items-center justify-center gap-[0.375rem] rounded-[6.25rem] border border-[#356FE8] bg-[linear-gradient(90deg,#3973EE_0%,#356FE8_55%,#2F67E0_100%)] px-[1rem] py-[0.625rem] font-inter text-[1rem] font-semibold leading-[1.5rem] text-white shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] transition-all duration-200 hover:border-[#5F8EF5] hover:bg-[linear-gradient(90deg,#5488FA_0%,#3C76F2_42%,#2C64DF_100%)] hover:shadow-[0_0.625rem_1.375rem_rgba(41,112,255,0.2),0_0_0_0.0625rem_rgba(95,142,245,0.55)] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {isSubmitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}

export default AddGroupModal;
