import React from "react";

function ContentPanel({ children }) {
  return (
    <section className="absolute top-[4.6875rem] right-[1.5rem] bottom-[1.5rem] left-[6.56rem] overflow-hidden rounded-[1.3125rem] bg-white shadow-[0_0_0_0.0625rem_rgba(181,204,244,0.42),0_0_1.5rem_rgba(132,171,237,0.18),0_0.25rem_0.25rem_rgba(0,0,0,0.22),0_0.25rem_2.75rem_rgba(0,0,0,0.2)_inset] backdrop-blur-[1.0625rem]">
      <div className="dashboard-panel-scroll h-full w-full overflow-y-auto overscroll-y-contain overflow-x-hidden">
        {children}
      </div>
    </section>
  );
}

export default ContentPanel;
