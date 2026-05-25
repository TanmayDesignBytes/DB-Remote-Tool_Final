import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowUp, MoreVertical, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import ActionMenu, {
  getDefaultDashboardActionItems,
  installDashboardActionItems,
} from "./ActionMenu.jsx";
import AddDeviceModal from "./AddDeviceModal.jsx";
import ActionConfirmModal from "./ActionConfirmModal.jsx";
import DeviceFilesModal from "./DeviceFilesModal.jsx";
import DeviceResourcesModal from "./DeviceResourcesModal.jsx";
import DeviceTerminalModal from "./DeviceTerminalModal.jsx";
import {
  deleteDevice,
  generateDeviceCode,
  getGroups,
  getMyDevices,
  logResourcesOpened,
  rebootAgent,
  rebootOperatingSystem,
  searchDevices,
  toggleDevice,
  updateDeviceDetails,
} from "../../lib/api.js";

const filterTabs = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "unavailable", label: "Unavailable" },
  { id: "to-install", label: "To Install" },
];

const defaultGroupOptions = [
  { id: "GCU", label: "GCU" },
  { id: "Microgrid", label: "Microgrid" },
  { id: "Koel", label: "Koel" },
];

const ACTIVE_TAB_WIDTH_REM = 9.19954;

const tabButtonLayout = {
  all: "left-[4.31799rem] w-[1.54356rem]",
  available: "left-[12.92954rem] w-[5.43331rem]",
  unavailable: "left-[22.61285rem] w-[6.85338rem]",
  "to-install": "left-[32.86623rem] w-[5.375rem]",
};

const MENU_WIDTH_REM = 12.1875;
const MENU_GAP_REM = 0.5;
const VIEWPORT_MARGIN_REM = 1;
const MENU_ITEM_HEIGHT_REM = 2.125;
const MENU_VERTICAL_PADDING_REM = 0.5;
const PENDING_DEVICE_POLL_MS = 10000;

function getPendingTransitionKeys(device) {
  const keys = [];

  if (device?.generatedCode) {
    keys.push(`code:${String(device.generatedCode)}`);
  }

  if (device?.deviceIdentifier) {
    keys.push(`device:${String(device.deviceIdentifier)}`);
  }

  if (device?.id != null) {
    keys.push(`id:${String(device.id)}`);
  }

  return keys;
}

function formatDeviceDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(date);
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isIpAddressLike(value) {
  const text = String(value || "").trim();

  if (!text) {
    return false;
  }

  return (
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(text) ||
    (/^[0-9a-f:]+$/i.test(text) && text.includes(":"))
  );
}

function getDisplayLocation(device, fallback = "Pune") {
  const candidates = [
    device?.location,
    device?.city,
    device?.cityName,
    device?.site,
    device?.area,
    device?.place,
    device?.branch,
    device?.hostname,
  ];

  for (const value of candidates) {
    const text = String(value || "").trim();
    const normalized = text.toLowerCase();

    if (!text || normalized === "null" || normalized === "undefined") {
      continue;
    }

    if (isIpAddressLike(text)) {
      continue;
    }

    return text;
  }

  return fallback;
}

function toRootRem(value) {
  const rootSize = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  );

  if (!Number.isFinite(rootSize) || rootSize <= 0) {
    return `${value / 16}rem`;
  }

  return `${value / rootSize}rem`;
}

function toBooleanLike(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "online", "enabled"].includes(normalized)) {
      return true;
    }
    if (
      ["false", "0", "no", "n", "offline", "disabled", "null", ""].includes(
        normalized,
      )
    ) {
      return false;
    }
  }
  return null;
}

function getDeviceGeneratedCode(device) {
  return (
    device.code ||
    device.generated_code ||
    device.generatedCode ||
    device.install_code ||
    device.installCode ||
    device.registration_code ||
    device.registrationCode ||
    device.pairing_code ||
    device.pairingCode ||
    device.pair_code ||
    device.pairCode ||
    ""
  );
}

function getDeviceIdentityKeys(device) {
  const keys = [];

  if (device?.id != null) {
    keys.push(`id:${String(device.id)}`);
  }

  if (device?.deviceIdentifier) {
    keys.push(`device:${String(device.deviceIdentifier).trim().toLowerCase()}`);
  }

  if (device?.generatedCode) {
    keys.push(`code:${String(device.generatedCode).trim().toLowerCase()}`);
  }

  const title = String(device?.title || device?.name || "").trim().toLowerCase();
  const location = String(getDisplayLocation(device, ""))
    .trim()
    .toLowerCase();

  if (title) {
    keys.push(`title:${title}`);
  }

  if (title && location) {
    keys.push(`title-location:${title}:${location}`);
  }

  return keys;
}

function mergeSearchDevicesWithExisting(existingDevices, searchDevices) {
  const existingByKey = new Map();

  existingDevices.forEach((device) => {
    getDeviceIdentityKeys(device).forEach((key) => {
      existingByKey.set(key, device);
    });
  });

  return searchDevices.map((device) => {
    const matchedExisting = getDeviceIdentityKeys(device)
      .map((key) => existingByKey.get(key))
      .find(Boolean);

    if (!matchedExisting) {
      return device;
    }

    return {
      ...device,
      title: matchedExisting.title || device.title,
      type: matchedExisting.type || device.type,
      group: matchedExisting.group || device.group,
      description: matchedExisting.description || device.description,
      location: matchedExisting.location || device.location,
      date: matchedExisting.date || device.date,
      accent: matchedExisting.accent || device.accent,
      generatedCode: matchedExisting.generatedCode || device.generatedCode,
      deviceIdentifier: matchedExisting.deviceIdentifier || device.deviceIdentifier,
      status: device.status || matchedExisting.status,
      isDisabled:
        typeof device.isDisabled === "boolean"
          ? device.isDisabled
          : matchedExisting.isDisabled,
      previousStatus: device.previousStatus || matchedExisting.previousStatus,
    };
  });
}

function getDeviceSearchFields(device) {
  return [
    device?.title,
    device?.name,
    device?.type,
    device?.group,
    device?.description,
    device?.location,
    device?.date,
    device?.generatedCode,
    device?.deviceIdentifier,
  ].filter(Boolean);
}

function deviceMatchesSearch(device, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchableValue = getDeviceSearchFields(device)
    .join(" ")
    .toLowerCase();

  if (searchableValue.includes(normalizedQuery)) {
    return true;
  }

  const compactQuery = normalizeSearchText(query);

  if (!compactQuery) {
    return false;
  }

  return normalizeSearchText(searchableValue).includes(compactQuery);
}

function getDeviceResultKey(device) {
  return (
    getDeviceIdentityKeys(device)[0] ||
    [
      device?.title,
      device?.name,
      device?.group,
      device?.location,
      device?.generatedCode,
    ]
      .filter(Boolean)
      .join(":")
      .toLowerCase()
  );
}

function mergeDeviceSearchResults(primaryDevices, secondaryDevices) {
  const result = [];
  const seenKeys = new Set();

  [...primaryDevices, ...secondaryDevices].forEach((device) => {
    const key = getDeviceResultKey(device);

    if (!key || seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    result.push(device);
  });

  return result;
}

function mapDeviceStatus(device) {
  const generatedCode = getDeviceGeneratedCode(device);
  const rawIdentifier =
    device.device_id ?? device.deviceId ?? device.deviceIdentifier ?? "";
  const normalizedIdentifier = String(rawIdentifier || "").trim().toLowerCase();
  const hasDeviceIdentifier =
    normalizedIdentifier !== "" &&
    normalizedIdentifier !== "null" &&
    normalizedIdentifier !== "undefined";
  const onlineFlag = toBooleanLike(
    device.is_online ?? device.isOnline ?? device.online,
  );
  const disabledFlag = toBooleanLike(
    device.is_disabled ??
      device.is_disable ??
      device.isDisable ??
      device.disabled,
  );

  if (!hasDeviceIdentifier && onlineFlag !== true) {
    return "to-install";
  }

  if (device.status) {
    const normalizedStatus = String(device.status).trim().toLowerCase();
    if (normalizedStatus === "to_install") return "to-install";
    if (
      ["online", "offline", "disabled", "to-install"].includes(
        normalizedStatus,
      )
    ) {
      return normalizedStatus;
    }
    return String(device.status);
  }

  if (disabledFlag !== null) {
    return disabledFlag ? "disabled" : onlineFlag === true ? "online" : "offline";
  }

  if (onlineFlag !== null) {
    return onlineFlag ? "online" : "offline";
  }

  if (!hasDeviceIdentifier && generatedCode) {
    return "to-install";
  }

  return "offline";
}

function getDeviceAccent(status, onlineFlag, disabledFlag) {
  if (status === "to-install") {
    return "#D6DAE5";
  }

  if (status === "disabled" || disabledFlag === true) {
    return "#D1D5DB";
  }

  if (onlineFlag === false) {
    return "#FF7373";
  }

  return "#60FAC4";
}

function mapApiDevice(device) {
  const status = mapDeviceStatus(device);
  const onlineFlag = toBooleanLike(
    device.is_online ?? device.isOnline ?? device.online,
  );
  const disabledFlag = toBooleanLike(
    device.is_disabled ??
      device.is_disable ??
      device.isDisable ??
      device.disabled,
  );
  const accent = getDeviceAccent(status, onlineFlag, disabledFlag);
  const previousStatus =
    status === "disabled"
      ? onlineFlag === true
        ? "online"
        : "offline"
      : status;

  return {
    id: device.id ?? device.deviceDbId ?? device.device_id ?? Date.now(),
    title:
      device.name || device.deviceName || device.hostname || "Unnamed Device",
    type: device.group || device.os || "Device",
    group: device.group || device.os || "Device",
    accent,
    description:
      device.description != null && device.description !== ""
        ? device.description
        : "I've updated the user interface",
    location: getDisplayLocation(device),
    date: formatDeviceDate(device.last_connected || device.created_at) || "2 Mar 26",
    status,
    isDisabled: status === "disabled",
    previousStatus,
    generatedCode: getDeviceGeneratedCode(device),
    deviceIdentifier:
      device.device_id ?? device.deviceId ?? device.deviceIdentifier ?? "",
    isPendingOnly: Boolean(device.isPendingOnly),
  };
}

function resolveDisabledState(response, fallbackValue) {
  const candidates = [
    response?.is_disabled,
    response?.data?.is_disabled,
    response?.isDisable,
    response?.data?.isDisable,
    response?.disabled,
    response?.data?.disabled,
    response?.is_disabled === false ? false : undefined,
    response?.data?.is_disabled === false ? false : undefined,
  ];

  for (const value of candidates) {
    if (typeof value === "boolean") {
      return value;
    }
  }

  const onlineCandidates = [
    response?.is_online,
    response?.data?.is_online,
    response?.device?.is_online,
    response?.data?.device?.is_online,
  ];

  for (const value of onlineCandidates) {
    if (typeof value === "boolean") {
      return !value;
    }
  }

  return fallbackValue;
}

function getDeviceItems(response) {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.all)) {
    return response.all;
  }
  if (Array.isArray(response?.data?.all)) {
    return response.data.all;
  }
  if (Array.isArray(response?.devices)) {
    return response.devices;
  }
  if (Array.isArray(response?.data?.devices)) {
    return response.data.devices;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
}

function normalizeGroupName(value) {
  return String(value || "").trim();
}

function getGroupItems(response) {
  const rawGroups = Array.isArray(response?.groups)
    ? response.groups
    : Array.isArray(response?.data?.groups)
      ? response.data.groups
      : Array.isArray(response?.data)
        ? response.data
        : [];

  return rawGroups
    .map((group) => {
      if (typeof group === "string") {
        return {
          backendId: null,
          name: normalizeGroupName(group),
          description: "",
        };
      }

      return {
        backendId: group?.id ?? null,
        name: normalizeGroupName(group?.name),
        description: String(group?.description || "").trim(),
      };
    })
    .filter((group) => group.name);
}

function buildGroupCards(devices, backendGroups) {
  const groupMap = new Map(
    defaultGroupOptions.map((option) => [
      option.label,
      {
        id: `group:${option.label}`,
        backendId: null,
        name: option.label,
        description: "",
        count: 0,
      },
    ]),
  );

  backendGroups.forEach((group) => {
    const groupKey = normalizeGroupName(group.name);
    const existing = groupMap.get(groupKey);

    if (!groupKey) {
      return;
    }

    groupMap.set(groupKey, {
      id: group.backendId ? `group:${group.backendId}` : `group:${groupKey}`,
      backendId: group.backendId ?? null,
      name: group.name,
      description: group.description || existing?.description || "",
      count: existing?.count || 0,
    });
  });

  devices.forEach((device) => {
    const groupName = String(device?.group || "").trim();

    if (!groupName) {
      return;
    }

    const existing = groupMap.get(groupName) || {
      id: `group:${groupName}`,
      backendId: null,
      name: groupName,
      description: "",
      count: 0,
    };

    groupMap.set(groupName, {
      ...existing,
      count: existing.count + 1,
      description:
        existing.description ||
        String(device?.description || "").trim() ||
        `Devices assigned to ${groupName}`,
    });
  });

  return Array.from(groupMap.values()).map((group) => ({
    id: group.id,
    backendId: group.backendId,
    name: group.name,
    label: `${group.count} device${group.count === 1 ? "" : "s"}`,
    description: group.description || "No devices assigned yet.",
  }));
}

function groupCardMatchesSearch(group, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return false;
  }

  const searchableValue = [group?.name, group?.label, group?.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (searchableValue.includes(normalizedQuery)) {
    return true;
  }

  const compactQuery = normalizeSearchText(query);

  if (!compactQuery) {
    return false;
  }

  return normalizeSearchText(searchableValue).includes(compactQuery);
}

function DeviceGlyph({ accent, isInstallCard = false, isDisabled = false }) {
  return (
    <span className="relative flex h-[2.0625rem] w-[2.0625rem] shrink-0 items-center justify-center rounded-[0.4375rem] bg-[#F4F7FE] px-[0.5625rem] pb-[0.4375rem] pl-[0.625rem] pt-[0.5rem] transition-colors duration-300 ease-out">
      <span
        className="absolute left-0 top-[0.25rem] h-[1.5rem] w-[0.3125rem] rounded-[0.15625rem] transition-colors duration-300 ease-out"
        style={{ backgroundColor: accent }}
      />
      <img
        src="/assets/piobject.png"
        alt=""
        className={cn(
          "h-[1.125rem] w-[0.875rem] shrink-0 object-contain transition-all duration-300 ease-out",
          (isInstallCard || isDisabled) && "grayscale opacity-60",
        )}
      />
    </span>
  );
}

function FooterText({ children, title, className, isDisabled = false }) {
  return (
    <span
      title={title}
      className={cn(
        "min-w-0 truncate font-dmSans text-[1rem] font-medium leading-[2.125rem] tracking-normal transition-colors duration-300 ease-out",
        isDisabled ? "text-[#9CA3AF]" : "text-black",
        className,
      )}
    >
      {children}
    </span>
  );
}

function DeviceFooter({
  leadingIcon,
  leadingLabel,
  leadingTitle,
  leadingTooltip = "",
  dateLabel,
  dateTitle,
  compactLeading = false,
  isDisabled = false,
}) {
  return (
    <div
      className={cn(
        "mt-auto flex h-[3.625rem] w-full min-w-0 shrink-0 flex-col items-start gap-[0.625rem] self-stretch rounded-[0.25rem] pb-[0.8125rem] pl-[0.9375rem] pr-[0.875rem] pt-[0.75rem] transition-colors duration-300 ease-out",
        isDisabled ? "bg-black/10" : "bg-[#F3F6FD]",
      )}
    >
      <div className="flex h-[2.0625rem] w-full min-w-0 items-center">
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-[0.625rem]",
            compactLeading ? "pr-[0.625rem]" : "pr-[2.25rem]",
          )}
        >
          {leadingIcon}
          {leadingTooltip ? (
            <span
              className="group/code-tooltip relative min-w-0 flex-1"
              tabIndex={0}
            >
              <FooterText
                title={leadingTitle}
                className="block max-w-full"
                isDisabled={isDisabled}
              >
                {leadingLabel}
              </FooterText>
              <span className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-0 z-20 max-w-[15rem] rounded-[0.375rem] bg-[#111827] px-[0.625rem] py-[0.375rem] font-dmSans text-[0.875rem] font-medium leading-[1.25rem] text-white opacity-0 shadow-[0_0.5rem_1rem_rgba(15,23,42,0.18)] transition-opacity duration-150 group-hover/code-tooltip:opacity-100 group-focus/code-tooltip:opacity-100">
                {leadingTooltip}
              </span>
            </span>
          ) : (
            <FooterText title={leadingTitle} isDisabled={isDisabled}>
              {leadingLabel}
            </FooterText>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-center gap-[0.5rem] self-stretch">
          <img
            src="/assets/Vector 2.svg"
            alt=""
            className={cn(
              "h-[2rem] w-[0.0625rem] shrink-0 object-contain transition-all duration-300 ease-out",
              isDisabled && "opacity-60 grayscale",
            )}
          />

          <div className="flex min-w-0 flex-1 items-center gap-[0.3125rem]">
            <img
              src="/assets/Time_duotone.svg?v=figma-clock-2"
              alt=""
              className={cn(
                "h-[1.625rem] w-[1.625rem] shrink-0 object-contain transition-all duration-300 ease-out",
                isDisabled && "opacity-60 grayscale",
              )}
            />
            <FooterText
              title={dateTitle}
              className="whitespace-nowrap"
              isDisabled={isDisabled}
            >
              {dateLabel}
            </FooterText>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardMeta({ device, isDisabled = false }) {
  const location = device.location || "Pune";
  const date = device.date || "2 Mar 26";

  return (
    <DeviceFooter
      leadingIcon={
        <img
          src="/assets/marker-pin-01.svg"
          alt=""
          className={cn(
            "h-[1.25rem] w-[1.25rem] shrink-0 object-contain transition-all duration-300 ease-out",
            isDisabled && "opacity-60 grayscale",
          )}
        />
      }
      leadingLabel={location}
      leadingTitle={location}
      dateLabel={date}
      dateTitle={date}
      isDisabled={isDisabled}
    />
  );
}

function ToInstallFooter({ device, isDisabled = false }) {
  const code = device.generatedCode || "-";

  return (
    <div
      className={cn(
        "mt-auto flex h-[3.625rem] w-full min-w-0 shrink-0 items-center rounded-[0.25rem] pb-[0.8125rem] pl-[0.9375rem] pr-[0.875rem] pt-[0.75rem] transition-colors duration-300 ease-out",
        isDisabled ? "bg-black/10" : "bg-[#F3F6FD]",
      )}
    >
      <div className="flex h-[2.0625rem] min-w-0 flex-1 items-center gap-[0.625rem] pr-[0.625rem]">
        <img
          src="/assets/Info_alt_duotone.svg"
          alt=""
          className={cn(
            "h-[1.5rem] w-[1.5rem] shrink-0 object-contain transition-all duration-300 ease-out",
            isDisabled && "opacity-60 grayscale",
          )}
        />
        <span
          title={code}
          className={cn(
            "min-w-0 truncate font-dmSans text-[1rem] font-medium leading-[2.125rem] tracking-normal transition-colors duration-300 ease-out",
            isDisabled ? "text-[#9CA3AF]" : "text-black",
          )}
        >
          {code}
        </span>
      </div>

      <img
        src="/assets/Vector 2.svg"
        alt=""
        className={cn(
          "h-[2rem] w-[0.0625rem] shrink-0 object-contain transition-all duration-300 ease-out",
          isDisabled && "opacity-60 grayscale",
        )}
      />

      <div className="flex h-[2.0625rem] min-w-0 flex-[1.15] items-center gap-[0.3125rem] pl-[1rem]">
        <img
          src="/assets/download-04.svg"
          alt=""
          className={cn(
            "h-[0.875rem] w-[0.875rem] shrink-0 object-contain transition-all duration-300 ease-out",
            isDisabled && "opacity-60 grayscale",
          )}
        />
        <span
          className={cn(
            "min-w-0 truncate font-dmSans text-[0.875rem] font-medium leading-[2.625rem] tracking-normal transition-colors duration-300 ease-out",
            isDisabled ? "text-[#9CA3AF]" : "text-black",
          )}
        >
          To Install
        </span>
      </div>
    </div>
  );
}

function DeviceCard({ device, onOpenTerminal, onToggleMenu }) {
  const normalizedDeviceIdentifier = String(device.deviceIdentifier || "")
    .trim()
    .toLowerCase();
  const hasLinkedAgent =
    normalizedDeviceIdentifier !== "" &&
    normalizedDeviceIdentifier !== "null" &&
    normalizedDeviceIdentifier !== "undefined";
  const isInstallCard = device.status === "to-install" || !hasLinkedAgent;
  const isDisabled = Boolean(device.isDisabled || device.status === "disabled");
  const canOpenTerminal = !isInstallCard && hasLinkedAgent;

  return (
    <article
      role={canOpenTerminal ? "button" : undefined}
      tabIndex={canOpenTerminal ? 0 : undefined}
      onClick={canOpenTerminal ? () => onOpenTerminal?.(device) : undefined}
      onKeyDown={
        canOpenTerminal
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenTerminal?.(device);
              }
            }
          : undefined
      }
      className={cn(
        "group relative flex h-[13.9375rem] w-[19.6875rem] shrink-0 flex-col justify-center rounded-[0.9375rem] border px-[1.0625rem] pb-[0.75rem] pt-[1.75rem] transition-all duration-300 ease-out",
        isDisabled
          ? "border-[#D1D5DB] bg-black/10"
          : "border-[rgba(217,217,217,0.5)] bg-white hover:shadow-[0_1.25rem_2.5rem_rgba(0,0,0,0.15),0_0.5rem_1rem_rgba(0,0,0,0.10)]",
      )}
    >
      <div className="flex h-[7.3125rem] w-full items-start justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-[0.5rem]">
          <DeviceGlyph
            accent={device.accent}
            isInstallCard={isInstallCard}
            isDisabled={isDisabled}
          />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[0.4375rem]">
            <h2
              className={cn(
                "h-[2.49275rem] w-full truncate font-inter text-[1.375rem] font-bold leading-[2.625rem] transition-colors duration-300 ease-out",
                isDisabled ? "text-[#9CA3AF]" : "text-black",
              )}
            >
              {device.title}
            </h2>
            <p
              className={cn(
                "h-[1.371rem] w-full truncate font-inter text-[0.875rem] font-medium leading-[1.5rem] transition-colors duration-300 ease-out",
                isDisabled ? "text-[#6B7280]" : "text-[#5D657D]",
              )}
            >
              {device.type}
            </p>
            <p
              className={cn(
                "h-[1.371rem] w-full truncate font-inter text-[0.875rem] font-medium leading-[1.5rem] transition-colors duration-300 ease-out",
                isDisabled ? "text-[#9CA3AF]" : "text-[#5D657D]",
              )}
            >
              {device.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={`${device.title} actions`}
          className="flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center text-[#3A3A3E] transition-opacity hover:opacity-70"
          onClick={(event) => {
            event.stopPropagation();
            onToggleMenu?.(event);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
        >
          <MoreVertical className="h-[1.6875rem] w-[1.6875rem]" />
        </button>
      </div>

      {isInstallCard ? (
        <ToInstallFooter device={device} isDisabled={isDisabled} />
      ) : (
        <CardMeta device={device} isDisabled={isDisabled} />
      )}
    </article>
  );
}

function FixedActionMenu({ anchorEl, device, onClose, onAction }) {
  const [menuStyle, setMenuStyle] = useState(null);
  const menuRef = useRef(null);
  const normalizedDeviceIdentifier = String(device?.deviceIdentifier || "")
    .trim()
    .toLowerCase();
  const hasLinkedAgent =
    normalizedDeviceIdentifier !== "" &&
    normalizedDeviceIdentifier !== "null" &&
    normalizedDeviceIdentifier !== "undefined";
  const isInstallCard =
    device?.status === "to-install" || (device != null && !hasLinkedAgent);
  const menuItems = isInstallCard
    ? installDashboardActionItems
    : getDefaultDashboardActionItems(
        Boolean(device?.isDisabled || device?.status === "disabled"),
      );
  const menuHeight =
    menuItems.length * MENU_ITEM_HEIGHT_REM + MENU_VERTICAL_PADDING_REM;

  useLayoutEffect(() => {
    if (!anchorEl) {
      return undefined;
    }

    const updatePosition = () => {
      const rootFontSize =
        Number.parseFloat(
          window.getComputedStyle(document.documentElement).fontSize,
        ) || 16;
      const rect = anchorEl.getBoundingClientRect();
      const menuWidth = MENU_WIDTH_REM * rootFontSize;
      const menuHeightPx = menuHeight * rootFontSize;
      const gap = MENU_GAP_REM * rootFontSize;
      const margin = VIEWPORT_MARGIN_REM * rootFontSize;

      let left = rect.right + gap;
      if (left + menuWidth > window.innerWidth - margin) {
        left = rect.left - menuWidth - gap;
      }

      left = Math.min(
        Math.max(left, margin),
        window.innerWidth - menuWidth - margin,
      );

      const top = Math.min(
        Math.max(rect.top, margin),
        window.innerHeight - menuHeightPx - margin,
      );

      setMenuStyle({
        left: `${left}px`,
        top: `${top}px`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorEl, menuHeight]);

  useEffect(() => {
    if (!anchorEl) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) {
        return;
      }
      if (anchorEl.contains(event.target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorEl, onClose]);

  if (!anchorEl || !menuStyle) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[999] max-h-[calc(100vh-2rem)] overflow-visible"
      style={menuStyle}
    >
      <ActionMenu
        items={menuItems}
        onAction={(action) => {
          onAction?.(action, device);
          onClose();
        }}
      />
    </div>,
    document.body,
  );
}

function DashboardContent({
  searchQuery = "",
  onDashboardOverlayChange = undefined,
  onSearchSuggestionsChange = undefined,
}) {
  const [selectedTab, setSelectedTab] = useState("all");
  const [deviceList, setDeviceList] = useState([]);
  const [backendGroups, setBackendGroups] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [devicesError, setDevicesError] = useState("");
  const [isSubmittingDevice, setIsSubmittingDevice] = useState(false);
  const [addDeviceError, setAddDeviceError] = useState("");
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [editDeviceError, setEditDeviceError] = useState("");
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [deletingDevice, setDeletingDevice] = useState(null);
  const [deleteDeviceError, setDeleteDeviceError] = useState("");
  const [isDeletingDevice, setIsDeletingDevice] = useState(false);
  const [togglingDeviceId, setTogglingDeviceId] = useState(null);
  const [rebootOsDevice, setRebootOsDevice] = useState(null);
  const [rebootOsError, setRebootOsError] = useState("");
  const [isRebootingOs, setIsRebootingOs] = useState(false);
  const [rebootAgentDevice, setRebootAgentDevice] = useState(null);
  const [rebootAgentError, setRebootAgentError] = useState("");
  const [isRebootingAgent, setIsRebootingAgent] = useState(false);
  const [resourcesDevice, setResourcesDevice] = useState(null);
  const [filesDevice, setFilesDevice] = useState(null);
  const [terminalDevice, setTerminalDevice] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [isScrollTopVisible, setIsScrollTopVisible] = useState(false);
  const [activeTabStyle, setActiveTabStyle] = useState({
    width: "0rem",
    left: "0rem",
    visible: false,
  });

  const groupMenuRef = useRef(null);
  const dashboardContentRef = useRef(null);
  const scrollTopHideTimeoutRef = useRef(null);
  const tabRefs = useRef({});
  const pendingRefreshIntervalRef = useRef(null);
  const previousPendingDeviceKeysRef = useRef(new Set());

  useEffect(() => {
    onDashboardOverlayChange?.(Boolean(resourcesDevice || filesDevice));

    return () => {
      onDashboardOverlayChange?.(false);
    };
  }, [filesDevice, onDashboardOverlayChange, resourcesDevice]);

  const loadGroups = useCallback(async () => {
    try {
      const response = await getGroups();
      setBackendGroups(getGroupItems(response));
    } catch {
      setBackendGroups([]);
    }
  }, []);

  const updateActiveTabStyle = useCallback(() => {
    const activeTab = tabRefs.current[selectedTab];
    if (!activeTab) {
      return;
    }

    const rootSize =
      Number.parseFloat(
        window.getComputedStyle(document.documentElement).fontSize,
      ) || 16;
    const activeTabWidthPx = ACTIVE_TAB_WIDTH_REM * rootSize;
    const leftOffset =
      activeTab.offsetLeft + (activeTab.offsetWidth - activeTabWidthPx) / 2;

    setActiveTabStyle({
      width: `${ACTIVE_TAB_WIDTH_REM}rem`,
      left: toRootRem(leftOffset),
      visible: true,
    });
  }, [selectedTab]);

  useEffect(() => {
    updateActiveTabStyle();
  }, [updateActiveTabStyle]);

  useEffect(() => {
    window.addEventListener("resize", updateActiveTabStyle);
    return () => window.removeEventListener("resize", updateActiveTabStyle);
  }, [updateActiveTabStyle]);

  useEffect(() => {
    const handleClick = (event) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target)) {
        setGroupMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const scrollContainer = dashboardContentRef.current?.closest(
      ".dashboard-panel-scroll",
    );

    if (!scrollContainer) {
      return undefined;
    }

    const handleScroll = () => {
      window.clearTimeout(scrollTopHideTimeoutRef.current);

      if (scrollContainer.scrollTop <= 80) {
        setIsScrollTopVisible(false);
        return;
      }

      setIsScrollTopVisible(true);
      scrollTopHideTimeoutRef.current = window.setTimeout(() => {
        setIsScrollTopVisible(false);
      }, 1100);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.clearTimeout(scrollTopHideTimeoutRef.current);
    };
  }, []);

  const loadDevices = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoadingDevices(true);
      setDevicesError("");
    }

    try {
      const response = await getMyDevices();
      const items = getDeviceItems(response);
      const mappedDevices = items.map(mapApiDevice);
      setDeviceList(mappedDevices);
      return mappedDevices;
    } catch (error) {
      if (!silent) {
        setDeviceList([]);
        setDevicesError(error?.message || "Failed to load devices");
      }
      return [];
    } finally {
      if (!silent) {
        setIsLoadingDevices(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    const currentPendingDevices = deviceList.filter(
      (device) => device.status === "to-install",
    );
    const currentPendingKeys = new Set(
      currentPendingDevices.flatMap(getPendingTransitionKeys),
    );
    const currentDevicesByKey = new Map();

    deviceList.forEach((device) => {
      getPendingTransitionKeys(device).forEach((key) => {
        currentDevicesByKey.set(key, device);
      });
    });

    const transitionedDeviceIds = Array.from(
      previousPendingDeviceKeysRef.current,
    ).filter((deviceKey) => {
      const nextDevice = currentDevicesByKey.get(deviceKey);
      return nextDevice && nextDevice.status !== "to-install";
    });

    if (
      selectedTab === "to-install" &&
      (transitionedDeviceIds.length > 0 ||
        (previousPendingDeviceKeysRef.current.size > 0 &&
          currentPendingDevices.length === 0))
    ) {
      setSelectedTab("all");
    }

    previousPendingDeviceKeysRef.current = currentPendingKeys;

    if (pendingRefreshIntervalRef.current) {
      window.clearInterval(pendingRefreshIntervalRef.current);
      pendingRefreshIntervalRef.current = null;
    }

    if (currentPendingDevices.length === 0) {
      return undefined;
    }

    pendingRefreshIntervalRef.current = window.setInterval(() => {
      void loadDevices({ silent: true });
    }, PENDING_DEVICE_POLL_MS);

    return () => {
      if (pendingRefreshIntervalRef.current) {
        window.clearInterval(pendingRefreshIntervalRef.current);
        pendingRefreshIntervalRef.current = null;
      }
    };
  }, [deviceList, loadDevices, selectedTab]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();

    if (!normalizedQuery) {
      setSearchResults(null);
      return undefined;
    }

    const localMatches = deviceList.filter((device) =>
      deviceMatchesSearch(device, normalizedQuery),
    );

    setSearchResults(localMatches);

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await searchDevices(normalizedQuery);
        const items = getDeviceItems(response);
        const apiDevices = items.map(mapApiDevice);
        const mergedDevices = mergeSearchDevicesWithExisting(
          deviceList,
          apiDevices,
        );

        if (!isCancelled) {
          setSearchResults(
            mergeDeviceSearchResults(localMatches, mergedDevices),
          );
        }
      } catch {
        if (!isCancelled) {
          setSearchResults(localMatches);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [deviceList, searchQuery]);

  const groupOptions = useMemo(() => {
    const sourceDevices = searchResults ?? deviceList;
    const optionMap = new Map(
      defaultGroupOptions.map((option) => [option.id, option.label]),
    );

    for (const device of sourceDevices) {
      if (device.group) {
        optionMap.set(device.group, device.group);
      }
    }

    return Array.from(optionMap, ([id, label]) => ({ id, label }));
  }, [deviceList, searchResults]);

  const groupCards = useMemo(
    () => buildGroupCards(deviceList, backendGroups),
    [backendGroups, deviceList],
  );

  const filteredDevices = useMemo(() => {
    const sourceDevices = searchResults ?? deviceList;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sourceDevices.filter((device) => {
      if (selectedGroup && device.group !== selectedGroup) {
        return false;
      }

      let matchesTab = true;
      if (selectedTab === "available") {
        matchesTab = device.status === "online";
      } else if (selectedTab === "unavailable") {
        matchesTab = device.status === "offline" || device.status === "disabled";
      } else if (selectedTab === "to-install") {
        matchesTab = device.status === "to-install";
      } else if (selectedTab === "all") {
        matchesTab = device.status !== "to-install";
      }

      if (!matchesTab) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return deviceMatchesSearch(device, searchQuery);
    });
  }, [deviceList, searchQuery, searchResults, selectedGroup, selectedTab]);

  const matchingGroupCards = useMemo(() => {
    if (!searchQuery.trim() || filteredDevices.length > 0) {
      return [];
    }

    return groupCards.filter((group) =>
      groupCardMatchesSearch(group, searchQuery),
    );
  }, [filteredDevices.length, groupCards, searchQuery]);

  useEffect(() => {
    onSearchSuggestionsChange?.(
      matchingGroupCards.map((group) => ({
        id: group.id,
        type: "group",
        kicker: "Found in Group card",
        title: group.name,
        description: group.label,
      })),
    );
  }, [matchingGroupCards, onSearchSuggestionsChange]);

  useEffect(
    () => () => {
      onSearchSuggestionsChange?.([]);
    },
    [onSearchSuggestionsChange],
  );

  const emptyStateMessage = useMemo(() => {
    if (isLoadingDevices) {
      return "Loading devices...";
    }
    if (devicesError && filteredDevices.length === 0) {
      return devicesError;
    }
    if (filteredDevices.length > 0) {
      return null;
    }
    if (searchQuery.trim()) {
      return "No devices found for this search";
    }
    if (selectedGroup && selectedTab === "available") {
      return `No available devices in ${selectedGroup}`;
    }
    if (selectedGroup && selectedTab === "unavailable") {
      return `No unavailable devices in ${selectedGroup}`;
    }
    if (selectedGroup && selectedTab === "to-install") {
      return `No devices to install in ${selectedGroup}`;
    }
    if (selectedTab === "available") {
      return "No available devices";
    }
    if (selectedTab === "unavailable") {
      return "No unavailable devices";
    }
    if (selectedTab === "to-install") {
      return "No devices to install";
    }
    return "No devices found";
  }, [
    devicesError,
    filteredDevices.length,
    isLoadingDevices,
    searchQuery,
    selectedGroup,
    selectedTab,
  ]);

  const handleToggleMenu = useCallback((device, anchorEl) => {
    setOpenMenu((current) => {
      if (current?.id === device.id) {
        return null;
      }
      return { id: device.id, anchorEl, device };
    });
  }, []);

  const handleClearFilter = useCallback(() => {
    setSelectedGroup(null);
    setGroupMenuOpen(false);
  }, []);

  const handleRefreshDevices = useCallback(async () => {
    if (isRefreshingDevices) {
      return;
    }

    setIsRefreshingDevices(true);
    try {
      await loadDevices();
    } finally {
      setIsRefreshingDevices(false);
    }
  }, [isRefreshingDevices, loadDevices]);

  const handleConfirmAddDevice = useCallback(
    async (values) => {
      if (isSubmittingDevice) {
        return;
      }

      setIsSubmittingDevice(true);
      setAddDeviceError("");

      const payload = {
        deviceName: values.name.trim() || "15- HAL",
        group: values.group,
        description:
          values.description.trim() || "I've updated the user interface",
      };

      try {
        const response = await generateDeviceCode(payload);
        const backendId =
          response?.deviceDbId ??
          response?.id ??
          response?.device?.id ??
          response?.device?.deviceDbId ??
          null;
        const createdDevice = mapApiDevice({
          id: backendId ?? Date.now(),
          deviceDbId: backendId,
          deviceName:
            response?.deviceName ??
            response?.device?.name ??
            payload.deviceName,
          group: response?.group ?? response?.device?.group ?? payload.group,
          description:
            response?.description ??
            response?.device?.description ??
            payload.description,
          hostname: response?.hostname ?? response?.device?.hostname ?? "Pune",
          code: response?.code ?? response?.device?.code ?? "",
          status: "to-install",
          isPendingOnly: backendId == null,
        });

        setDeviceList((current) => [createdDevice, ...current]);
        setSelectedGroup(null);
        setSelectedTab("to-install");
        setIsAddDeviceOpen(false);
      } catch (error) {
        setAddDeviceError(error?.message || "Failed to add device");
      } finally {
        setIsSubmittingDevice(false);
      }
    },
    [isSubmittingDevice],
  );

  const handleEditDevice = useCallback(
    async (values) => {
      if (!editingDevice || isSavingDevice) {
        return;
      }

      const payload = {
        name: values.name,
        group: values.group,
        description: values.description,
      };

      setIsSavingDevice(true);
      setEditDeviceError("");

      try {
        await updateDeviceDetails(editingDevice.id, payload);
        await loadDevices();
        setEditingDevice(null);
      } catch (error) {
        setEditDeviceError(error?.message || "Failed to update device");
      } finally {
        setIsSavingDevice(false);
      }
    },
    [editingDevice, isSavingDevice, loadDevices],
  );

  const handleDeleteDevice = useCallback(async () => {
    if (!deletingDevice || isDeletingDevice) {
      return;
    }

    setIsDeletingDevice(true);
    setDeleteDeviceError("");

    try {
      await deleteDevice(deletingDevice.id);
      await loadDevices();
      setDeletingDevice(null);
    } catch (error) {
      setDeleteDeviceError(error?.message || "Failed to delete device");
    } finally {
      setIsDeletingDevice(false);
    }
  }, [deletingDevice, isDeletingDevice, loadDevices]);

  const handleToggleDisable = useCallback(
    async (device) => {
      if (!device || togglingDeviceId != null) {
        return;
      }

      const isDisabled = device.isDisabled || device.status === "disabled";
      setTogglingDeviceId(device.id);

    try {
      const response = await toggleDevice(device.id, {
        action: isDisabled ? "enable" : "disable",
      });
      const resolvedIsDisabled = resolveDisabledState(response, !isDisabled);
      const getNextState = (item) => {
        const previousStatus =
          item.status === "disabled"
            ? item.previousStatus || "offline"
            : item.status || item.previousStatus || "offline";
        const nextStatus = resolvedIsDisabled ? "disabled" : previousStatus;
        const nextOnlineFlag =
          nextStatus === "online"
            ? true
            : nextStatus === "offline"
              ? false
              : null;

        return {
          previousStatus,
          status: nextStatus,
          accent: getDeviceAccent(
            nextStatus,
            nextOnlineFlag,
            resolvedIsDisabled,
          ),
        };
      };

        setDeviceList((current) =>
          current.map((item) =>
            item.id === device.id
              ? {
                  ...item,
                  isDisabled: resolvedIsDisabled,
                  ...getNextState(item),
                }
              : item,
          ),
        );
        setSearchResults((current) =>
          current == null
            ? current
            : current.map((item) =>
                item.id === device.id
                  ? {
                      ...item,
                      isDisabled: resolvedIsDisabled,
                      ...getNextState(item),
                    }
                  : item,
              ),
        );
      } finally {
        setTogglingDeviceId(null);
      }
    },
    [togglingDeviceId],
  );

  const handleRebootOs = useCallback(async () => {
    if (!rebootOsDevice?.deviceIdentifier || isRebootingOs) {
      setRebootOsError("Device agent id is missing.");
      return;
    }

    setIsRebootingOs(true);
    setRebootOsError("");

    try {
      await rebootOperatingSystem(rebootOsDevice.deviceIdentifier);
      setRebootOsDevice(null);
    } catch (error) {
      setRebootOsError(error?.message || "Failed to reboot operating system");
    } finally {
      setIsRebootingOs(false);
    }
  }, [isRebootingOs, rebootOsDevice]);

  const handleRebootAgent = useCallback(async () => {
    if (!rebootAgentDevice?.deviceIdentifier || isRebootingAgent) {
      setRebootAgentError("Device agent id is missing.");
      return;
    }

    setIsRebootingAgent(true);
    setRebootAgentError("");

    try {
      await rebootAgent(rebootAgentDevice.deviceIdentifier);
      setRebootAgentDevice(null);
    } catch (error) {
      setRebootAgentError(error?.message || "Failed to reboot agent");
    } finally {
      setIsRebootingAgent(false);
    }
  }, [isRebootingAgent, rebootAgentDevice]);

  const handleMenuAction = useCallback((action, device) => {
    if (!device) {
      return;
    }

    const normalizedDeviceIdentifier = String(device.deviceIdentifier || "")
      .trim()
      .toLowerCase();
    const hasLinkedAgent =
      normalizedDeviceIdentifier !== "" &&
      normalizedDeviceIdentifier !== "null" &&
      normalizedDeviceIdentifier !== "undefined";
    const isInstallCard = device.status === "to-install" || !hasLinkedAgent;

    if (action === "edit") {
      setEditDeviceError("");
      setEditingDevice(device);
    }

    if (action === "delete") {
      setDeleteDeviceError("");
      setDeletingDevice(device);
    }

    if (!isInstallCard && action === "disable") {
      void handleToggleDisable(device);
    }

    if (!isInstallCard && action === "reboot-os") {
      setRebootOsError("");
      setRebootOsDevice(device);
    }

    if (!isInstallCard && action === "reboot-agent") {
      setRebootAgentError("");
      setRebootAgentDevice(device);
    }

    if (!isInstallCard && action === "resource") {
      void logResourcesOpened(device.deviceIdentifier).catch(() => {});
      setResourcesDevice(device);
    }

    if (!isInstallCard && action === "files-and-folder") {
      setFilesDevice(device);
    }
  }, [handleToggleDisable]);

  const handleScrollToTop = useCallback(() => {
    dashboardContentRef.current
      ?.closest(".dashboard-panel-scroll")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleScrollTopPointerEnter = useCallback(() => {
    window.clearTimeout(scrollTopHideTimeoutRef.current);
  }, []);

  const handleScrollTopPointerLeave = useCallback(() => {
    scrollTopHideTimeoutRef.current = window.setTimeout(() => {
      setIsScrollTopVisible(false);
    }, 450);
  }, []);

  return (
    <>
      <div
        ref={dashboardContentRef}
        className="h-full pl-[2.5rem] pr-[1.72rem] pt-[1.5rem] font-inter"
      >
        <div className="w-full">
          <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-[1rem]">
                <div className="relative h-[3.5625rem] w-[40.625rem] rounded-full border border-[#F0F0F0] bg-white shadow-[0_0.19794rem_0.79175rem_rgba(0,0,0,0.05)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[0.38rem] h-[2.75rem] rounded-[1.36088rem] bg-[#2970FF] shadow-[0_0.19794rem_0.19794rem_rgba(0,0,0,0.15)] transition-all duration-300 ease-out"
                    style={{
                      width: activeTabStyle.width,
                      transform: `translateX(${activeTabStyle.left})`,
                      opacity: activeTabStyle.visible ? 1 : 0,
                    }}
                  />
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      ref={(element) => {
                        tabRefs.current[tab.id] = element;
                      }}
                      onClick={() => setSelectedTab(tab.id)}
                      className={cn(
                        "absolute inset-y-0 z-[1] flex items-center justify-center font-inter text-[1.125rem] font-semibold leading-[1.18763rem] transition-colors duration-300 ease-out",
                        tabButtonLayout[tab.id],
                        selectedTab === tab.id
                          ? "text-white"
                          : "text-[rgba(0,0,0,0.75)]",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void handleRefreshDevices()}
                  disabled={isLoadingDevices || isRefreshingDevices}
                  className="flex h-[3.5rem] w-[3.5rem] shrink-0 items-center justify-center rounded-full border border-[#F0F0F0] bg-white text-[#2970FF] shadow-[0_0.19794rem_0.79175rem_rgba(0,0,0,0.05)] transition-all duration-200 ease-out hover:border-[#D6E4FF] hover:bg-[#F4F7FE] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Refresh devices"
                  title="Refresh devices"
                >
                  <RefreshCw
                    className={cn(
                      "h-[1.375rem] w-[1.375rem]",
                      isRefreshingDevices && "animate-spin",
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-[1.5rem]">
                <div ref={groupMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setGroupMenuOpen((value) => !value)}
                    className={cn(
                      "flex h-[3.5rem] w-[14.44rem] items-center justify-between rounded-[0.625rem] border pl-[1.875rem] pr-[1.25rem] font-inter text-[1rem] font-semibold leading-[1.18763rem]",
                      selectedGroup
                        ? "border-[#2970FF] bg-[#F0F4F8] text-[#2970FF]"
                        : "border-[#ECECEC] bg-white text-[rgba(0,0,0,0.75)]",
                    )}
                  >
                    <span className="truncate">
                      {selectedGroup
                        ? groupOptions.find((option) => option.id === selectedGroup)
                            ?.label
                        : "Group"}
                    </span>
                    <img
                      src="/assets/chevron-down.svg"
                      alt=""
                      className="h-[1.5rem] w-[1.5rem] shrink-0"
                    />
                  </button>

                {groupMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-[14.44rem] rounded-[0.5rem] border border-[#ECECEC] bg-white py-1 shadow-[0_0.25rem_0.25rem_rgba(0,0,0,0.25),0_0.75rem_1.25rem_rgba(7,6,18,0.25)]">
                    {selectedGroup ? (
                      <>
                        <button
                          type="button"
                          onClick={handleClearFilter}
                          className="flex w-full items-center px-4 py-2 text-left text-[0.875rem] font-medium text-[#EF4444] transition-colors hover:bg-[#F8F9FC]"
                        >
                          Clear Filter
                        </button>
                        <div className="my-1 h-px bg-[#ECECEC]" />
                      </>
                    ) : null}
                    {groupOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroup(option.id);
                          setGroupMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center px-4 py-2 text-left text-[0.875rem] font-medium transition-colors hover:bg-[#F8F9FC]",
                          selectedGroup === option.id
                            ? "bg-[#F0F4F8] text-[#2970FF]"
                            : "text-[#33363F]",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
                </div>

                <button
                  type="button"
                  className="flex h-[3.5rem] w-[9.25rem] items-center justify-center gap-[0.13rem] rounded-[1.75rem] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] font-inter text-[1rem] font-semibold leading-[1.18763rem] text-white"
                  onClick={() => {
                    setAddDeviceError("");
                    setIsAddDeviceOpen(true);
                  }}
                >
                  <img
                    src="/assets/plus.svg"
                    alt=""
                    className="h-[1.3125rem] w-[1.3125rem] shrink-0"
                  />
                  <span className="h-[1.125rem] w-[5.5625rem] text-left">
                    Add Device
                  </span>
                </button>
              </div>
            </div>

          <div className="-ml-[0.75rem] mt-[1.53rem] h-px w-[calc(100%+0.75rem)] bg-[#ECECEC]" />

          {emptyStateMessage ? (
            <div className="mt-[1.375rem] flex h-[13.9375rem] w-[81.625rem] items-center justify-center rounded-[0.9375rem] bg-white px-6 text-center font-inter text-[1rem] font-medium text-[#5D657D]">
              {emptyStateMessage}
            </div>
          ) : (
            <div className="mt-[1.375rem] grid w-[81.625rem] grid-cols-4 gap-x-[1.25rem] gap-y-[2.25rem]">
              {filteredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onOpenTerminal={(nextDevice) => setTerminalDevice(nextDevice)}
                  onToggleMenu={(event) =>
                    handleToggleMenu(device, event.currentTarget)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleScrollToTop}
        onPointerEnter={handleScrollTopPointerEnter}
        onPointerLeave={handleScrollTopPointerLeave}
        aria-label="Return to top"
        title="Return to top"
        className={cn(
          "fixed bottom-[3rem] right-[3rem] z-30 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-[#2970FF] text-white shadow-[0_0.35rem_1rem_rgba(41,112,255,0.34)] transition-all duration-200 ease-out hover:bg-[#205FE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2970FF] focus-visible:ring-offset-2",
          isScrollTopVisible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-[0.5rem] opacity-0",
        )}
      >
        <ArrowUp className="h-[1.375rem] w-[1.375rem]" />
      </button>

      <FixedActionMenu
        anchorEl={openMenu?.anchorEl ?? null}
        device={openMenu?.device ?? null}
        onAction={handleMenuAction}
        onClose={() => setOpenMenu(null)}
      />

      <AddDeviceModal
        open={Boolean(editingDevice)}
        onClose={() => {
          if (isSavingDevice) {
            return;
          }
          setEditDeviceError("");
          setEditingDevice(null);
        }}
        onConfirm={handleEditDevice}
        initialValues={
          editingDevice
            ? {
                name: editingDevice.title,
                group: editingDevice.group,
                description: editingDevice.description,
              }
            : undefined
        }
        groupOptions={groupOptions.map((option) => option.label)}
        title="Edit Device Details"
        confirmLabel="Save"
        isSubmitting={isSavingDevice}
        errorMessage={editDeviceError}
      />

      <ActionConfirmModal
        open={Boolean(deletingDevice)}
        title="Delete device"
        message={`Are you sure you want to delete ${deletingDevice?.title || "this device"}?`}
        confirmLabel="Delete"
        isSubmitting={isDeletingDevice}
        errorMessage={deleteDeviceError}
        onClose={() => {
          if (isDeletingDevice) {
            return;
          }
          setDeleteDeviceError("");
          setDeletingDevice(null);
        }}
        onConfirm={handleDeleteDevice}
      />

      <ActionConfirmModal
        open={Boolean(rebootOsDevice)}
        title="Agent"
        message={`Reboot the operating system of agent '${rebootOsDevice?.group || "Device"} - ${rebootOsDevice?.title || ""}'?`}
        confirmLabel="Yes"
        isSubmitting={isRebootingOs}
        errorMessage={rebootOsError}
        onClose={() => {
          if (isRebootingOs) {
            return;
          }
          setRebootOsError("");
          setRebootOsDevice(null);
        }}
        onConfirm={handleRebootOs}
      />

      <ActionConfirmModal
        open={Boolean(rebootAgentDevice)}
        title="Agent"
        message={`Reboot agent '${rebootAgentDevice?.group || "Device"} - ${rebootAgentDevice?.title || ""}'?`}
        confirmLabel="Yes"
        isSubmitting={isRebootingAgent}
        errorMessage={rebootAgentError}
        onClose={() => {
          if (isRebootingAgent) {
            return;
          }
          setRebootAgentError("");
          setRebootAgentDevice(null);
        }}
        onConfirm={handleRebootAgent}
      />

      <DeviceTerminalModal
        open={Boolean(terminalDevice)}
        device={terminalDevice}
        onClose={() => setTerminalDevice(null)}
      />

      <DeviceResourcesModal
        open={Boolean(resourcesDevice)}
        device={resourcesDevice}
        onClose={() => setResourcesDevice(null)}
      />

      <DeviceFilesModal
        open={Boolean(filesDevice)}
        device={filesDevice}
        onClose={() => setFilesDevice(null)}
      />

      <AddDeviceModal
        open={isAddDeviceOpen}
        onClose={() => {
          if (isSubmittingDevice) {
            return;
          }
          setAddDeviceError("");
          setIsAddDeviceOpen(false);
        }}
        onConfirm={handleConfirmAddDevice}
        groupOptions={groupOptions.map((option) => option.label)}
        isSubmitting={isSubmittingDevice}
        errorMessage={addDeviceError}
      />
    </>
  );
}

export default DashboardContent;
