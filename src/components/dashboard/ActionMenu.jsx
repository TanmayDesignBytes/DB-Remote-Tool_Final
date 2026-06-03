import React from "react";

export const installDashboardActionItems = [
  { label: "Edit", icon: "/assets/edit-03.svg", action: "edit" },
  { label: "Delete", icon: "/assets/trash-01.svg", action: "delete" },
];

export function getDefaultDashboardActionItems(isDisabled = false) {
  return [
    {
      label: "Edit",
      icon: "/assets/edit-03.svg",
      action: "edit",
      iconClassName: "h-[1rem] w-[1rem]",
      iconWrapperClassName: "h-[1rem] w-[1rem]",
    },
    {
      label: isDisabled ? "Enable" : "Disable",
      icon: "/assets/eye-off.svg",
      action: "disable",
      iconClassName: "h-[1rem] w-[1rem]",
      iconWrapperClassName: "h-[1rem] w-[1rem]",
    },
    {
      label: "Delete",
      icon: "/assets/trash-01.svg",
      action: "delete",
      iconClassName: "h-[1rem] w-[0.885625rem]",
      iconWrapperClassName: "h-[1rem] w-[1rem]",
    },
    {
      label: "Reboot - OS",
      icon: "/assets/Black.svg",
      action: "reboot-os",
      iconClassName: "h-[1rem] w-[0.88569rem]",
      iconWrapperClassName: "h-[1rem] w-[1rem]",
    },
    {
      label: "Reboot - Agent",
      icon: "/assets/victor.svg",
      action: "reboot-agent",
      iconClassName: "h-[1.25rem] w-[1.3125rem]",
      iconWrapperClassName: "h-[1.25rem] w-[1.3125rem]",
    },
    {
      label: "Resource",
      icon: "/assets/cube-01.svg",
      action: "resource",
      iconClassName: "h-[1.23201rem] w-[1.125rem]",
      iconWrapperClassName: "h-[1.23201rem] w-[1.125rem]",
    },
    {
      label: "Files and Folder",
      icon: "/assets/files-02.svg",
      action: "files-and-folder",
      iconClassName: "h-[1.23201rem] w-[1.125rem]",
      iconWrapperClassName: "h-[1.23201rem] w-[1.125rem]",
    },
  ];
}

function ActionMenu({ items = getDefaultDashboardActionItems(), onAction }) {
  return (
    <div className="dashboard-action-menu flex w-[12.1875rem] flex-col items-start self-stretch overflow-hidden rounded-[0.5rem] border border-[#EAECF0] bg-white p-[0.25rem] shadow-[0_0.25rem_0.25rem_rgba(0,0,0,0.25),0_0.75rem_1.25rem_rgba(7,6,18,0.25)]">
      {items.map(
        ({
          label,
          icon,
          action,
          iconClassName = "h-[1rem] w-[1rem]",
          iconWrapperClassName = "h-[1rem] w-[1rem]",
        }) => (
        <button
          key={label}
          type="button"
          className="flex w-full items-center gap-[0.75rem] px-[0.625rem] py-[0.5625rem] text-left transition-colors hover:bg-[#F4F7FE] first:rounded-t-[0.375rem] last:rounded-b-[0.375rem]"
          onClick={() => onAction?.(action)}
        >
          <span
            className={`flex shrink-0 items-center justify-center ${iconWrapperClassName}`}
          >
            <img
              src={icon}
              alt=""
              className={`${iconClassName} object-contain`}
              aria-hidden="true"
            />
          </span>
          <span className="font-inter text-[0.875rem] font-medium leading-[1.25rem] text-[#101728]">
            {label}
          </span>
        </button>
        ),
      )}
    </div>
  );
}

export default ActionMenu;
