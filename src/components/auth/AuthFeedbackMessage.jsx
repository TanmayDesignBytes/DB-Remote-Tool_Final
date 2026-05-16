import React from "react";

function AuthFeedbackMessage({ message, tone = "error" }) {
  if (!message) {
    return null;
  }

  const toneClasses =
    tone === "success" ? "text-[#027A48]" : "text-[#D92D20]";

  return (
    <p
      className={`self-stretch font-poppins text-[0.875rem] font-medium leading-[1.375rem] ${toneClasses}`}
    >
      {message}
    </p>
  );
}

export default AuthFeedbackMessage;
