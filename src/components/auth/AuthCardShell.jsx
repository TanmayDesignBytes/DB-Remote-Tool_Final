import React from "react";
import BrandLogo from "./BrandLogo.jsx";

function AuthCardShell({ title, description, children }) {
  return (
    <section className="flex w-[35rem] max-w-full flex-col items-center justify-center gap-[1.5rem] rounded-[1.5rem] bg-[#F7F8FC] p-[3.125rem] shadow-login-card backdrop-blur-[0.40625rem]">
      <BrandLogo />

      <div className="flex flex-col items-start gap-[0.75rem] self-stretch">
        <h1 className="font-poppins text-[1.25rem] font-semibold leading-[1.875rem] text-gray-900">
          {title}
        </h1>
        <p className="font-poppins text-[0.875rem] font-normal leading-[1.25rem] text-gray-600">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

export default AuthCardShell;
