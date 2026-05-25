import React, { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    Icon: DashboardIcon,
    iconClassName: "h-[1.125rem] w-[1.125rem]",
  },
  {
    key: "group",
    label: "Group",
    Icon: GroupIcon,
    iconClassName: "h-[1.125rem] w-[1.125rem]",
  },
  {
    key: "remote",
    label: "Remote",
    Icon: RemoteIcon,
    iconClassName: "h-[1.125rem] w-[1.125rem]",
  },
];

function Sidebar({ activeTab, onTabChange }) {
  const navRef = useRef(null);
  const tabRefs = useRef({});
  const [activePillStyle, setActivePillStyle] = useState({
    top: "0px",
    opacity: 0,
  });

  useEffect(() => {
    const activeNode = activeTab ? tabRefs.current[activeTab] : null;
    const navNode = navRef.current;

    if (!activeNode || !navNode) {
      setActivePillStyle((current) => ({ ...current, opacity: 0 }));
      return;
    }

    const nextTop = `${activeNode.offsetTop}px`;
    setActivePillStyle({
      top: nextTop,
      opacity: 1,
    });
  }, [activeTab]);

  return (
    <aside className="absolute left-0 top-[4.25rem] z-10 flex h-[49.81rem] w-[6.56rem] shrink-0 pl-[1.5rem]">
      <nav
        ref={navRef}
        className="relative flex w-[4.25rem] flex-col items-center gap-[3.75rem] pt-[1.94rem]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 h-[3.125rem] w-[3.125rem] -translate-x-1/2 rounded-[3.125rem] border border-[#CDDDFD] bg-[#CDDDFD] shadow-[0_0.625rem_1.25rem_rgba(41,112,255,0.16)]"
          style={{
            top: activePillStyle.top,
            opacity: activePillStyle.opacity,
          }}
        />
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          const Icon = item.Icon;

          return (
            <button
              ref={(node) => {
                if (node) {
                  tabRefs.current[item.key] = node;
                }
              }}
              key={item.key}
              type="button"
              aria-pressed={isActive}
              className="relative z-[1] flex h-[4.875rem] w-[4.25rem] shrink-0 flex-col items-center gap-[0.25rem]"
              onClick={() => onTabChange(item.key)}
            >
              <span
                className={cn(
                  "flex h-[3.125rem] w-[3.125rem] items-center justify-center rounded-[3.125rem] border shadow-[0_0.125rem_0.5rem_rgba(16,24,40,0.06)]",
                  isActive
                    ? "border-transparent bg-transparent text-[#2970FF] scale-100"
                    : "border-[#D9D9D9] bg-white text-[#33363F] scale-[0.98] hover:border-[#D8E4FF] hover:bg-[#F8FBFF] hover:text-[#2970FF]",
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0",
                    isActive ? "scale-100" : "scale-[0.94]",
                    item.iconClassName,
                  )}
                />
              </span>

              <span
                className={cn(
                  "font-inter text-[0.75rem] leading-[1.5rem]",
                  isActive
                    ? "translate-y-0 font-bold text-[#2970FF]"
                    : "translate-y-0.5 font-medium text-[#33363F]",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function DashboardIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 10H7C7.55 10 8 9.55 8 9V1C8 0.45 7.55 0 7 0H1C0.45 0 0 0.45 0 1V9C0 9.55 0.45 10 1 10ZM1 18H7C7.55 18 8 17.55 8 17V13C8 12.45 7.55 12 7 12H1C0.45 12 0 12.45 0 13V17C0 17.55 0.45 18 1 18ZM11 18H17C17.55 18 18 17.55 18 17V9C18 8.45 17.55 8 17 8H11C10.45 8 10 8.45 10 9V17C10 17.55 10.45 18 11 18ZM10 1V5C10 5.55 10.45 6 11 6H17C17.55 6 18 5.55 18 5V1C18 0.45 17.55 0 17 0H11C10.45 0 10 0.45 10 1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GroupIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(-2.16 -2.16) scale(1.18)">
        <path
          d="M9 6C9 7.65685 10.3431 9 12 9C13.6569 9 15 7.65685 15 6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6ZM13.1171 6C13.1171 6.61698 12.617 7.11714 12 7.11714C11.383 7.11714 10.8829 6.61698 10.8829 6C10.8829 5.38302 11.383 4.88286 12 4.88286C12.617 4.88286 13.1171 5.38302 13.1171 6Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M4.43781 13.9015C3.00293 14.7299 2.51131 16.5647 3.33974 17.9996C4.16816 19.4345 6.00293 19.9261 7.43781 19.0977C8.87269 18.2692 9.36432 16.4345 8.53589 14.9996C7.70746 13.5647 5.87269 13.0731 4.43781 13.9015ZM6.46518 17.413C5.96071 17.7043 5.31564 17.5314 5.02438 17.0269C4.73312 16.5225 4.90597 15.8774 5.41044 15.5861C5.91492 15.2949 6.55998 15.4677 6.85124 15.9722C7.1425 16.4767 6.96966 17.1218 6.46518 17.413Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M19.5622 13.9015C20.9971 14.7299 21.4887 16.5647 20.6603 17.9996C19.8318 19.4345 17.9971 19.9261 16.5622 19.0977C15.1273 18.2692 14.6357 16.4345 15.4641 14.9996C16.2925 13.5647 18.1273 13.0731 19.5622 13.9015ZM17.56 17.3693C18.0404 17.6467 18.6546 17.4821 18.9319 17.0017C19.2093 16.5214 19.0447 15.9072 18.5643 15.6298C18.084 15.3525 17.4698 15.5171 17.1924 15.9974C16.9151 16.4778 17.0797 17.092 17.56 17.3693Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M16.04 18.7139C16.1997 18.8597 16.3743 18.989 16.5625 19.0977C16.9036 19.2946 17.2804 19.4232 17.6709 19.4746C17.8562 19.499 18.0428 19.5035 18.2285 19.4932C17.4215 20.2673 16.4785 20.886 15.4443 21.3145C14.3524 21.7667 13.1819 22 12 22C10.8181 22 9.64759 21.7667 8.55566 21.3145C7.5213 20.8859 6.57766 20.2675 5.77051 19.4932C5.95653 19.5036 6.14349 19.499 6.3291 19.4746C6.71968 19.4232 7.09633 19.2946 7.4375 19.0977C7.62547 18.9891 7.79945 18.8595 7.95898 18.7139C8.38312 19.0135 8.83926 19.2671 9.32129 19.4668C10.1706 19.8186 11.0807 20 12 20C12.9193 20 13.8294 19.8186 14.6787 19.4668C15.1605 19.2672 15.6161 19.0133 16.04 18.7139ZM9.49023 4.35938C9.38842 4.5151 9.30006 4.67982 9.22852 4.85254C9.07784 5.21638 9.00004 5.6062 9 6C9 6.21694 9.02497 6.43268 9.07129 6.64355C8.32046 6.98931 7.63532 7.46433 7.0498 8.0498C6.39988 8.69973 5.88498 9.47214 5.5332 10.3213C5.18146 11.1705 5.00004 12.0809 5 13C5 13.2148 5.0106 13.4294 5.03027 13.6426C4.82462 13.7079 4.62526 13.793 4.4375 13.9014C4.09632 14.0983 3.79745 14.3613 3.55762 14.6738C3.44366 14.8224 3.34476 14.9812 3.26074 15.1475C3.08838 14.4463 3 13.7252 3 13C3.00004 11.8182 3.23329 10.6475 3.68555 9.55566C4.13783 8.46396 4.80016 7.47132 5.63574 6.63574C6.47136 5.80017 7.46393 5.13781 8.55566 4.68555C8.86133 4.55894 9.17373 4.45134 9.49023 4.35938ZM14.5088 4.35938C14.8256 4.4514 15.1384 4.55882 15.4443 4.68555C16.5361 5.13781 17.5286 5.80017 18.3643 6.63574C19.1998 7.47132 19.8622 8.46396 20.3145 9.55566C20.7667 10.6475 21 11.8182 21 13C21 13.7253 20.9107 14.4463 20.7383 15.1475C20.6543 14.9813 20.5562 14.8222 20.4424 14.6738C20.2026 14.3613 19.9036 14.0983 19.5625 13.9014C19.3745 13.7928 19.1747 13.7079 18.9688 13.6426C18.9884 13.4294 19 13.2149 19 13C19 12.0808 18.8185 11.1705 18.4668 10.3213C18.115 9.47214 17.6001 8.69973 16.9502 8.0498C16.3645 7.46412 15.6789 6.98934 14.9277 6.64355C14.9741 6.43262 15 6.217 15 6C15 5.60621 14.9222 5.21636 14.7715 4.85254C14.6999 4.67968 14.6107 4.51521 14.5088 4.35938Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

function RemoteIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(-1.62 -1.62) scale(1.18)">
        <path
          d="M2.25 3.25C2.25 2.55964 2.80964 2 3.5 2H14.5C15.1904 2 15.75 2.55964 15.75 3.25V10.25C15.75 10.9404 15.1904 11.5 14.5 11.5H3.5C2.80964 11.5 2.25 10.9404 2.25 10.25V3.25Z"
          fill="currentColor"
        />
        <path
          d="M7 13.25H11C11.4142 13.25 11.75 13.5858 11.75 14C11.75 14.4142 11.4142 14.75 11 14.75H7C6.58579 14.75 6.25 14.4142 6.25 14C6.25 13.5858 6.58579 13.25 7 13.25Z"
          fill="currentColor"
        />
        <path d="M8.25 11.25H9.75V13.75H8.25V11.25Z" fill="currentColor" />
        <path
          d="M5.25 5.5C5.25 5.08579 5.58579 4.75 6 4.75H12C12.4142 4.75 12.75 5.08579 12.75 5.5V8.75C12.75 9.16421 12.4142 9.5 12 9.5H6C5.58579 9.5 5.25 9.16421 5.25 8.75V5.5Z"
          fill="white"
          fillOpacity="0.18"
        />
        <path
          d="M5.75 7.125L7.5 8.75L11.5 5.5"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export default Sidebar;
