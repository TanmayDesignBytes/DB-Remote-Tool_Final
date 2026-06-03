import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getResources, sendResourceAction } from "../../lib/api.js";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatBytes(value) {
  if (!Number.isFinite(value)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const digits = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(digits)} ${units[unitIndex]}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function Sparkline({ values = [], color = "#E0A85E", fill = "#F4D3A2" }) {
  const path = useMemo(() => {
    if (!values.length) return "";
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    const width = 240;
    const height = 80;
    const step = width / Math.max(values.length - 1, 1);
    const points = values.map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    return `M ${points[0]} L ${points.slice(1).join(" ")}`;
  }, [values]);

  if (!path) {
    return <div className="h-[5rem] w-full" />;
  }

  return (
    <svg viewBox="0 0 240 80" className="h-[5rem] w-full">
      <path d={`${path} L 240,80 L 0,80 Z`} fill={fill} opacity="0.55" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DonutChart({ value = 0, accent = "#BFD98B" }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const size = 120;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative flex h-[7.5rem] w-[7.5rem] items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute text-[0.875rem] font-semibold text-[#1f2937]">
        {pct}%
      </div>
    </div>
  );
}

function DeviceResourcesModal({ open, device, onClose }) {
  const prevOpenRef = useRef(false);
  const intervalRef = useRef(null);
  const [resourcesData, setResourcesData] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memoryHistory, setMemoryHistory] = useState([]);
  const deviceIdentifier = String(device?.deviceIdentifier || "").trim();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !deviceIdentifier) {
      return undefined;
    }

    // Clear old data when device changes
    setResourcesData({});
    setErrorMessage("");
    setCpuHistory([]);
    setMemoryHistory([]);

    const fetchData = async () => {
      try {
        const data = await getResources(deviceIdentifier);
        setResourcesData(data || {});
        setErrorMessage("");
        const apiData = data?.data || {};
        const perf = apiData.performance || {};
        const cpuUsage = perf.cpu?.usagePercent;
        const memoryUsage = perf.memory?.usagePercent;

        if (Number.isFinite(cpuUsage)) {
          setCpuHistory((prev) => [...prev, cpuUsage].slice(-30));
        }

        if (Number.isFinite(memoryUsage)) {
          setMemoryHistory((prev) => [...prev, memoryUsage].slice(-30));
        }
      } catch (error) {
        const errorMsg = error?.message || "Failed to load resource data.";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    };

    void fetchData();
    intervalRef.current = window.setInterval(fetchData, 2000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [deviceIdentifier, open]);

  useEffect(() => {
    if (!deviceIdentifier) {
      return;
    }

    const wasOpen = prevOpenRef.current;
    const isNowOpen = open;

    if (!wasOpen && isNowOpen) {
      sendResourceAction(deviceIdentifier, "opened").catch(() => {});
    }

    if (wasOpen && !isNowOpen) {
      sendResourceAction(deviceIdentifier, "closed").catch(() => {});
    }

    prevOpenRef.current = isNowOpen;
  }, [deviceIdentifier, open]);

  const parsedData = useMemo(() => {
    const apiData = resourcesData?.data || {};
    return {
      overview: {
        operatingSystem: apiData.operatingSystem || {},
        cpu: apiData.cpu || {},
        hostname: apiData.hostname || "—",
      },
      performance: apiData.performance || {},
      disks: Array.isArray(apiData.disks) ? apiData.disks : [],
    };
  }, [resourcesData]);

  if (!open) {
    return null;
  }

  const cpuPerf = parsedData.performance.cpu || {};
  const memPerf = parsedData.performance.memory || {};
  const noResourcesData =
    !errorMessage &&
    !parsedData.overview.operatingSystem?.display &&
    !parsedData.overview.cpu?.model &&
    !parsedData.overview.hostname &&
    !Number.isFinite(cpuPerf.usagePercent) &&
    !Number.isFinite(memPerf.usagePercent) &&
    parsedData.disks.length === 0;

  return (
    <>
      <div
        className="fixed inset-0 z-[1000] bg-[rgba(15,23,42,0.56)] backdrop-blur-[0.1875rem]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[1001]">
        <div
          className="fullscreen-tool-modal device-resources-modal flex h-full w-full overflow-hidden bg-white shadow-[0_1.75rem_4.5rem_rgba(15,23,42,0.18)]"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <aside className="flex w-[14.25rem] shrink-0 flex-col border-r border-[#EAECF0] bg-[#F8FAFC]">
            <div className="border-b border-[#EAECF0] px-5 py-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-[2.375rem] w-[2.375rem] items-center justify-center rounded-[0.75rem] border border-[#D0D5DD] bg-white text-[#344054] transition-colors hover:bg-[#F8FAFC]"
                  aria-label="Back to main page"
                >
                  <BackIcon />
                </button>
                <h2 className="font-inter text-[1.375rem] font-semibold text-[#1F2937]">
                  Resources
                </h2>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-3 pb-4 pt-3">
              <div className="rounded-[0.625rem] bg-[#E0EBFF] px-3 py-2 font-inter text-[0.9375rem] font-medium text-[#1849A9]">
                Overview
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#EAECF0] px-6 py-5">
              <div>
                <p className="font-inter text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#667085]">
                  Overview
                </p>
                <h2 className="mt-1 font-inter text-[1.25rem] font-semibold text-[#101828]">
                  {device?.title || "Device"} System Resources
                </h2>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
            {errorMessage ? (
              <div className="mb-5 rounded-[0.75rem] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 font-inter text-[0.875rem] font-medium text-[#B42318]">
                {errorMessage}
              </div>
            ) : null}

            {noResourcesData ? (
              <div className="mb-5 rounded-[0.75rem] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 font-inter text-[0.875rem] font-medium text-[#B42318]">
                {`No resources data available for device ${deviceIdentifier} yet`}
              </div>
            ) : null}

            <section className="rounded-[0.75rem] border border-[#EAECF0] bg-[#F8FAFC]">
              <div className="border-b border-[#EAECF0] px-4 py-3 text-[0.875rem] font-semibold text-[#344054]">
                Information
              </div>
              <div className="grid grid-cols-[11.25rem_1fr] gap-y-2 px-4 py-4 text-[0.875rem] text-[#475467]">
                <span>Operating system</span>
                <span className="font-medium text-[#1f2937]">
                  {parsedData.overview.operatingSystem?.display || "—"}
                </span>
                <span>CPU</span>
                <span className="font-medium text-[#1f2937]">
                  {parsedData.overview.cpu?.model || "—"}
                </span>
                <span>Architecture</span>
                <span className="font-medium text-[#1f2937]">
                  {parsedData.overview.cpu?.architecture || "—"}
                </span>
                <span>Name</span>
                <span className="font-medium text-[#1f2937]">
                  {parsedData.overview.hostname || "—"}
                </span>
              </div>
            </section>

            <section className="mt-6 rounded-[0.75rem] border border-[#EAECF0] bg-white">
              <div className="border-b border-[#EAECF0] bg-[#F4F4F5] px-4 py-3 text-[0.875rem] font-semibold text-[#344054]">
                Performance
              </div>
              <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                <div className="overflow-hidden rounded-[0.75rem] border border-[#E5E7EB] bg-white">
                  <div className="grid grid-cols-[1.1fr_1.4fr]">
                    <div className="border-r border-[#E5E7EB] px-6 py-5 text-center">
                      <p className="text-[1rem] font-semibold text-[#475467]">CPU</p>
                      <p className="mt-3 text-[2.5rem] font-semibold text-[#1f2937]">
                        {formatPercent(cpuPerf.usagePercent)}
                      </p>
                    </div>
                    <div className="flex items-end bg-white px-3 py-3">
                      <Sparkline
                        values={cpuHistory}
                        color="#E0A85E"
                        fill="#F4D3A2"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[0.75rem] border border-[#E5E7EB] bg-white">
                  <div className="grid grid-cols-[1.1fr_1.4fr]">
                    <div className="border-r border-[#E5E7EB] px-5 py-5">
                      <p className="text-[1rem] font-semibold text-[#475467]">Memory</p>
                      <div className="mt-3 space-y-2 text-[0.875rem] text-[#475467]">
                        <div className="flex items-center justify-between">
                          <span>Total</span>
                          <span className="font-medium text-[#1f2937]">
                            {formatBytes(memPerf.totalBytes)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Used</span>
                          <span className="font-medium text-[#1f2937]">
                            {formatBytes(memPerf.usedBytes)} ({formatPercent(memPerf.usagePercent)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Available</span>
                          <span className="font-medium text-[#1f2937]">
                            {formatBytes(memPerf.availableBytes)} ({formatPercent(100 - (memPerf.usagePercent || 0))})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end bg-white px-3 py-3">
                      <Sparkline
                        values={memoryHistory}
                        color="#8FA3BE"
                        fill="#CDD6E4"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-[0.75rem] border border-[#EAECF0] bg-white">
              <div className="border-b border-[#EAECF0] bg-[#F4F4F5] px-4 py-3 text-[0.875rem] font-semibold text-[#344054]">
                Disks and Partitions
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {parsedData.disks.length > 0 ? (
                  parsedData.disks.map((disk) => (
                    <div
                      key={disk.mountPoint || disk.device || disk.totalBytes}
                      className="flex flex-col gap-4 rounded-[0.75rem] border border-[#EAECF0] bg-white p-4"
                    >
                      <div>
                        <p className="font-inter text-[1.125rem] font-semibold text-[#1f2937]">
                          {disk.mountPoint || "Disk"}
                        </p>
                        <p className="font-inter text-[0.8125rem] text-[#475467]">
                          {formatBytes(disk.totalBytes)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-2 font-inter text-[0.8125rem] text-[#475467]">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-[0.125rem] border border-[#A3A3A3] bg-[#BFD98B]" />
                            <span>
                              Used {formatBytes(disk.usedBytes)} ({formatPercent(disk.usagePercent)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-[0.125rem] border border-[#A3A3A3] bg-white" />
                            <span>
                              Free {formatBytes(disk.freeBytes)} ({formatPercent(100 - (disk.usagePercent || 0))})
                            </span>
                          </div>
                        </div>
                        <DonutChart value={disk.usagePercent} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="m-4 rounded-[0.75rem] border border-dashed border-[#D0D5DD] px-4 py-6 font-inter text-[0.875rem] font-medium text-[#667085]">
                    No disk metrics available.
                  </div>
                )}
              </div>
            </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DeviceResourcesModal;
