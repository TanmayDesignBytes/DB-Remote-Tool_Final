import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

const EMPTY_VALUES = {
  name: "",
  group: "",
  description: "",
  hmiSerialNumber: {
    dropdown1: "10",
    dropdown2: "5",
    month: "01",
    year: new Date().getFullYear().toString().slice(-2),
    pin: "",
  },
};

const DROPDOWN1_OPTIONS = ["10", "21"];
const DROPDOWN2_OPTIONS = ["5", "12", "24"];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) =>
  String((new Date().getFullYear() - index) % 100).padStart(2, "0"),
);

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="#757578"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Field({ label, children, errorMessage = "" }) {
  return (
    <div className="flex w-full flex-col gap-[0.375rem] self-stretch">
      <label
        className="text-[0.875rem] font-normal leading-[1.25rem] text-[#344054]"
        style={{ fontFamily: "Poppins, sans-serif", fontStyle: "normal" }}
      >
        {label}
      </label>
      {children}
      {errorMessage ? (
        <p className="text-[0.75rem] font-medium leading-[1.125rem] text-[#D92D20]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function SerialSelect({ label, value, options, onChange }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-[0.75rem] font-semibold text-[#667085]">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="h-[3.4375rem] cursor-pointer appearance-none rounded-[0.5rem] border border-[#D0D5DD] bg-white px-[0.875rem] py-[0.625rem] pr-[2.1875rem] text-[1rem] font-normal leading-6 text-[#344054] shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] outline-none focus:ring-2 focus:ring-[#2970FF]/20"
        style={{
          fontFamily: "Inter, sans-serif",
          fontStyle: "normal",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'><path d='M6 9L12 15L18 9' stroke='%23757578' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.625rem center",
          backgroundSize: "1.25rem",
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  maxLength,
  required = false,
  ariaInvalid = false,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isFilled = String(value ?? "").trim().length > 0;

  return (
    <input
      type="text"
      placeholder={placeholder}
      className={`h-[3.4375rem] w-full rounded-[0.5rem] border px-[0.875rem] py-[0.625rem] text-[1rem] font-normal leading-6 text-[#344054] shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[#667085] focus:ring-2 focus:ring-[#2970FF]/20 disabled:cursor-not-allowed disabled:opacity-60 ${
        isFilled && !isFocused
          ? "border-[#D5DDEB] bg-[#F8FAFC]"
          : "border-[#D0D5DD] bg-white"
      }`}
      style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal" }}
      value={value}
      onChange={onChange}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={disabled}
      maxLength={maxLength}
      required={required}
      aria-invalid={ariaInvalid}
    />
  );
}

function AddDeviceModal({
  open,
  onClose,
  onConfirm,
  initialValues = EMPTY_VALUES,
  groupOptions: providedGroupOptions,
  title = "Add Device Details",
  confirmLabel = "Confirm",
  isSubmitting = false,
  errorMessage = "",
}) {
  const [formValues, setFormValues] = useState(EMPTY_VALUES);
  const [formErrors, setFormErrors] = useState({});

  const groupOptions = useMemo(
    () => (Array.isArray(providedGroupOptions) ? providedGroupOptions : []),
    [providedGroupOptions],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormValues({
      name: initialValues?.name ?? "",
      group: initialValues?.group ?? "",
      description: initialValues?.description ?? "",
      hmiSerialNumber: {
        dropdown1: initialValues?.hmiSerialNumber?.dropdown1 ?? "10",
        dropdown2: initialValues?.hmiSerialNumber?.dropdown2 ?? "5",
        month: initialValues?.hmiSerialNumber?.month ?? "01",
        year:
          initialValues?.hmiSerialNumber?.year ??
          new Date().getFullYear().toString().slice(-2),
        pin: initialValues?.hmiSerialNumber?.pin ?? "",
      },
    });
    setFormErrors({});

  }, [initialValues, open]);

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

  const handleHmiSerialChange = (subField) => (event) => {
    setFormValues((current) => ({
      ...current,
      hmiSerialNumber: {
        ...current.hmiSerialNumber,
        [subField]: event.target.value,
      },
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const requiredErrors = {
      ...(!formValues.name.trim()
        ? { name: "Device name is required." }
        : {}),
      ...(!formValues.group.trim() ? { group: "Group is required." } : {}),
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
      group: formValues.group.trim(),
      description: formValues.description.trim(),
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-[0.125rem]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-[min(90vw,32.125rem)] flex-col items-center overflow-hidden rounded-[1.25rem] bg-white p-[2rem] shadow-[0_0.25rem_0.25rem_rgba(0,0,0,0.25)] backdrop-blur-[0.40625rem] lg:p-[3.125rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          className="w-full text-[1.25rem] font-semibold leading-[1.875rem] text-[#101828]"
          style={{ fontFamily: "Poppins, sans-serif", fontStyle: "normal" }}
        >
          {title}
        </h2>

        <form
          className="mt-[1.5rem] flex min-h-0 w-full flex-1 flex-col lg:mt-[2rem]"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-[0.1875rem] py-[0.1875rem] pr-[0.9375rem]">
            <Field label="Device Name" errorMessage={formErrors.name}>
              <TextInput
                value={formValues.name}
                onChange={handleChange("name")}
                placeholder="Enter Device Name"
                disabled={isSubmitting}
                required
                ariaInvalid={Boolean(formErrors.name)}
              />
            </Field>

            <Field label="Group" errorMessage={formErrors.group}>
              <div className="relative">
                <select
                  className="h-[3.4375rem] w-full appearance-none rounded-[0.5rem] border border-[#D0D5DD] bg-white px-[0.875rem] py-[0.625rem] pr-[2.75rem] text-[1rem] font-normal leading-6 text-[#667085] shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] outline-none focus:ring-2 focus:ring-[#2970FF]/20"
                  style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal" }}
                  value={formValues.group}
                  onChange={handleChange("group")}
                  disabled={isSubmitting}
                  required
                  aria-invalid={Boolean(formErrors.group)}
                >
                  <option value="" disabled>
                    Select Group
                  </option>
                  {groupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-[0.875rem] flex items-center">
                  <ChevronDownIcon />
                </span>
              </div>
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

            <Field label="HMI Serial Number">
              <div className="grid grid-cols-5 gap-3">
                <SerialSelect
                  label="HMI Size"
                  value={formValues.hmiSerialNumber.dropdown1}
                  options={DROPDOWN1_OPTIONS}
                  onChange={handleHmiSerialChange("dropdown1")}
                />
                <SerialSelect
                  label="Volt"
                  value={formValues.hmiSerialNumber.dropdown2}
                  options={DROPDOWN2_OPTIONS}
                  onChange={handleHmiSerialChange("dropdown2")}
                />
                <SerialSelect
                  label="Month"
                  value={formValues.hmiSerialNumber.month}
                  options={MONTH_OPTIONS}
                  onChange={handleHmiSerialChange("month")}
                />
                <SerialSelect
                  label="Year"
                  value={formValues.hmiSerialNumber.year}
                  options={YEAR_OPTIONS}
                  onChange={handleHmiSerialChange("year")}
                />
                <div className="flex flex-col">
                  <label className="mb-1 text-[0.75rem] font-semibold text-[#667085]">
                    PIN
                  </label>
                  <TextInput
                    value={formValues.hmiSerialNumber.pin}
                    placeholder="PIN"
                    maxLength={4}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      const value = event.target.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 4);
                      handleHmiSerialChange("pin")({
                        target: { value },
                      });
                    }}
                  />
                </div>
              </div>
            </Field>

            {errorMessage ? (
              <div className="w-full rounded-[0.75rem] border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-[0.875rem] font-medium leading-5 text-[#b42318]">
                {errorMessage}
              </div>
            ) : null}
          </div>

          <div className="mt-[1.375rem] flex w-full items-start justify-start gap-[4.75rem]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex h-[2.75rem] w-[10.5625rem] items-center justify-center rounded-[6.25rem] border border-[#33363F] bg-white px-4 py-[0.625rem] text-[1rem] font-semibold leading-6 text-[#33363F] shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-[2.75rem] w-[10.5625rem] items-center justify-center rounded-[6.25rem] border border-[#356FE8] bg-[linear-gradient(90deg,#3973EE_0%,#356FE8_55%,#2F67E0_100%)] px-4 py-[0.625rem] text-[1rem] font-semibold leading-6 text-white shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] transition-all duration-200 hover:border-[#5F8EF5] hover:bg-[linear-gradient(90deg,#5488FA_0%,#3C76F2_42%,#2C64DF_100%)] hover:shadow-[0_0.625rem_1.375rem_rgba(41,112,255,0.2),0_0_0_0.0625rem_rgba(95,142,245,0.55)] disabled:cursor-not-allowed disabled:opacity-80"
              style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal" }}
            >
              {isSubmitting ? "Saving..." : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default AddDeviceModal;
