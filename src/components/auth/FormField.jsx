import React, { useState } from "react";

function FormField({
  label,
  type = "text",
  placeholder,
  value,
  readOnly = false,
  name,
  id,
  onChange,
  autoComplete,
  disabled = false,
  trailingAdornment = null,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isFilled = String(value ?? "").trim().length > 0;

  return (
    <label className="flex flex-col items-start gap-[0.375rem] self-stretch">
      <span className="font-poppins text-[0.875rem] font-normal leading-[1.25rem] text-gray-700">
        {label}
      </span>
      <div className="relative w-full self-stretch">
        <input
          className={[
            "flex h-[3.125rem] w-full items-center gap-[0.5rem] self-stretch rounded-[0.5rem] border px-[0.875rem] py-[0.625rem] font-inter text-[1rem] font-normal leading-[1.5rem] text-[#1F2937] shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[#B5BAC1] focus:ring-2 focus:ring-[#2970FF]/20 disabled:cursor-not-allowed disabled:opacity-60",
            isFilled && !isFocused
              ? "border-[#D5DDEB] bg-[#F8FAFC]"
              : "border-[#D0D5DD] bg-white",
            trailingAdornment ? "pr-[3.125rem]" : "",
          ].join(" ")}
          type={type}
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          name={name}
          id={id}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        {trailingAdornment ? (
          <div className="absolute right-[0.875rem] top-1/2 flex -translate-y-1/2 items-center">
            {trailingAdornment}
          </div>
        ) : null}
      </div>
    </label>
  );
}

export default FormField;
