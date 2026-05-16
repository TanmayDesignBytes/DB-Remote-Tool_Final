import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  LoaderCircle,
  Lock,
  Maximize2,
  Monitor,
  Server,
  Unplug,
} from "lucide-react";
import RemoteDesktopViewer from "./RemoteDesktopViewer.jsx";

function getDefaultProxyUrl() {
  if (import.meta.env.VITE_VNC_PROXY_URL) {
    return import.meta.env.VITE_VNC_PROXY_URL;
  }

  if (typeof window === "undefined") {
    return "ws://localhost:5000/vnc";
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host || "localhost:5000";

  return `${protocol}://${host}/vnc`;
}

function buildConnectionUrl(proxyUrl, host, port) {
  if (!proxyUrl || !host || !port) {
    return "";
  }

  try {
    const nextUrl = new URL(proxyUrl);
    nextUrl.searchParams.set("host", host);
    nextUrl.searchParams.set("port", port);
    return nextUrl.toString();
  } catch {
    return "";
  }
}

async function requestElementFullscreen(element) {
  if (!element?.requestFullscreen) {
    return;
  }

  try {
    await element.requestFullscreen();
  } catch {
    // Ignore browsers that block fullscreen because of gesture timing.
  }
}

async function exitFullscreenIfNeeded() {
  if (!document.fullscreenElement || !document.exitFullscreen) {
    return;
  }

  try {
    await document.exitFullscreen();
  } catch {
    // Ignore browser exit failures.
  }
}

function StatusPill({ status }) {
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isError = status === "auth-failed" || status === "error";

  const className = isConnected
    ? "border-[#CFEAD8] bg-[#ECFDF3] text-[#067647]"
    : isConnecting
      ? "border-[#D7E3FF] bg-[#EEF4FF] text-[#295FDD]"
      : isError
        ? "border-[#F7C5BF] bg-[#FFF4F3] text-[#B42318]"
        : "border-[#D9E2F0] bg-white text-[#475467]";

  const label = isConnected
    ? "Connected"
    : isConnecting
      ? "Connecting"
      : isError
        ? "Needs attention"
        : "Disconnected";

  return (
    <div
      className={`inline-flex items-center gap-[0.625rem] rounded-[999rem] border px-[1rem] py-[0.625rem] font-inter text-[0.875rem] font-semibold shadow-[0_0.625rem_1.5rem_rgba(15,23,42,0.06)] ${className}`}
    >
      <span className="h-[0.625rem] w-[0.625rem] rounded-full bg-current opacity-80" />
      <span>{label}</span>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
}) {
  return (
    <label className="block">
      <span className="mb-[0.625rem] block font-inter text-[0.875rem] font-semibold text-[#344054]">
        {label}
      </span>
      <div className="flex items-center gap-[0.75rem] rounded-[1rem] border border-[#D9E2F0] bg-white px-[1rem] py-[0.9375rem] shadow-[inset_0_0.0625rem_0_rgba(255,255,255,0.5)] transition focus-within:border-[#84ADFF] focus-within:ring-[0_0_0_0.25rem_rgba(41,112,255,0.10)]">
        <span className="flex h-[2.25rem] w-[2.25rem] shrink-0 items-center justify-center rounded-[0.875rem] bg-[#EEF4FF] text-[#2970FF] shadow-[0_0.125rem_0.5rem_rgba(15,23,42,0.06)]">
          {icon}
        </span>
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent font-inter text-[0.9375rem] font-semibold text-[#101828] outline-none placeholder:text-[#98A2B3]"
        />
      </div>
    </label>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  variant = "secondary",
  className = "",
}) {
  const baseClassName =
    "flex h-[3.125rem] items-center justify-center gap-[0.625rem] rounded-[1rem] font-inter text-[0.9375rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50";

  const variantClassName =
    variant === "primary"
      ? "bg-[linear-gradient(118deg,#4A73FF_9.79%,#2747B8_97.55%)] text-white shadow-[0_0.875rem_1.75rem_rgba(41,112,255,0.24)] hover:translate-y-[-0.0625rem]"
      : "border border-[#D9E2F0] bg-white text-[#344054] shadow-[0_0.375rem_1rem_rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClassName} ${variantClassName} ${className}`}
    >
      {children}
    </button>
  );
}

function RemoteContent({ onNavigateDashboard }) {
  const viewerShellRef = useRef(null);
  const manualDisconnectRef = useRef(false);
  const hasConnectedRef = useRef(false);

  const [ipAddress, setIpAddress] = useState("");
  const [proxyUrl, setProxyUrl] = useState(getDefaultProxyUrl());
  const [port, setPort] = useState(import.meta.env.VITE_VNC_PORT || "5900");
  const [password, setPassword] = useState("");
  const [connectionNonce, setConnectionNonce] = useState(0);
  const [connectRequested, setConnectRequested] = useState(false);
  const [viewerState, setViewerState] = useState({ status: "disconnected" });
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState(
    "Device no longer connected.",
  );
  const [isViewerFullscreen, setIsViewerFullscreen] = useState(false);

  const isSessionBusy =
    connectRequested ||
    viewerState.status === "connecting" ||
    viewerState.status === "connected";

  const connectionUrl = useMemo(
    () => buildConnectionUrl(proxyUrl.trim(), ipAddress.trim(), port.trim()),
    [ipAddress, port, proxyUrl],
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsViewerFullscreen(
        document.fullscreenElement === viewerShellRef.current,
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleViewerStatusChange = useCallback((nextState) => {
    setViewerState(nextState);

    if (nextState.status === "connected") {
      hasConnectedRef.current = true;
      return;
    }

    if (
      hasConnectedRef.current &&
      !manualDisconnectRef.current &&
      ["disconnected", "auth-failed", "error"].includes(nextState.status)
    ) {
      setDisconnectMessage(nextState.message || "Device no longer connected.");
      setDisconnectModalOpen(true);
      setConnectRequested(false);
      hasConnectedRef.current = false;
      void exitFullscreenIfNeeded();
    }
  }, []);

  const handleConnect = useCallback(async () => {
    if (!ipAddress.trim() || !connectionUrl) {
      return;
    }

    manualDisconnectRef.current = false;
    hasConnectedRef.current = false;
    setDisconnectModalOpen(false);
    await requestElementFullscreen(viewerShellRef.current);
    setConnectRequested(true);
    setConnectionNonce((current) => current + 1);
  }, [connectionUrl, ipAddress]);

  const handleDisconnect = useCallback(async () => {
    manualDisconnectRef.current = true;
    hasConnectedRef.current = false;
    setConnectRequested(false);
    await exitFullscreenIfNeeded();
  }, []);

  const viewerHeadline =
    viewerState.status === "connected"
      ? "Remote view connected"
      : viewerState.status === "connecting"
        ? "Connecting to remote view"
        : "Ready for remote view";

  const viewerMessage =
    viewerState.status === "connected"
      ? "Your device console is live. Use full screen for the best remote-control experience."
      : viewerState.status === "connecting"
        ? `Connecting to ${ipAddress.trim() || "the selected device"} through the configured VNC endpoint.`
        : viewerState.message ||
          "Enter the device IP address, add the VNC password, and connect to open the live screen.";

  return (
    <>
      <div className="h-full overflow-hidden bg-[#F4F7FB] px-[1.5rem] pb-[1rem] pt-[0.5rem] text-slate-900">
        <div className="mx-auto flex h-full w-full max-w-[96rem] flex-col">
          <div className="mb-[0.625rem] flex items-center justify-between pl-[1rem] pt-[0.375rem]">
            <h1 className="font-inter text-[1.125rem] font-semibold leading-[1.18763rem] text-[rgba(0,0,0,0.75)]">
              Remote Detail
            </h1>
            <StatusPill status={viewerState.status} />
          </div>

          <div className="flex min-h-0 flex-1 items-stretch gap-[1.5rem]">
            <aside className="flex h-full w-[27rem] shrink-0 flex-col rounded-[2rem] border border-[#E5ECF6] bg-white p-[1.5rem] shadow-[0_1.5rem_3rem_rgba(148,163,184,0.16)]">
              <div className="mb-[1.5rem] flex items-center gap-[1rem]">
                <div className="grid h-[4rem] w-[4rem] place-items-center rounded-[1.25rem] bg-[#EEF4FF] text-[#2970FF] ring-1 ring-[#D8E4FF]">
                  <Monitor className="h-[2rem] w-[2rem]" />
                </div>
                <div>
                  <h2 className="font-inter text-[1.125rem] font-bold text-slate-950">
                    Connection details
                  </h2>
                  <p className="mt-[0.25rem] font-inter text-[0.875rem] text-slate-500">
                    Keep these values in sync with your VNC server.
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-[0.25rem]">
                <div className="space-y-[1rem]">
                  <Field
                    icon={<Server className="h-[1.125rem] w-[1.125rem]" />}
                    label="IP Address"
                    value={ipAddress}
                    onChange={setIpAddress}
                    placeholder="10.106.59.229"
                  />

                  <div className="grid gap-[1rem] xl:grid-cols-1">
                    <Field
                      icon={<Monitor className="h-[1.125rem] w-[1.125rem]" />}
                      label="VNC Port"
                      value={port}
                      onChange={setPort}
                      inputMode="numeric"
                      placeholder="5900"
                    />

                    <Field
                      icon={<Lock className="h-[1.125rem] w-[1.125rem]" />}
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      type="password"
                      placeholder="Enter VNC password"
                    />
                  </div>
                </div>

                <div className="mt-[1.5rem] grid gap-[0.75rem] pb-[0.125rem]">
                  <ActionButton
                    onClick={() => void handleConnect()}
                    disabled={
                      isSessionBusy || !ipAddress.trim() || !connectionUrl
                    }
                    variant="primary"
                    className="w-full"
                  >
                    {viewerState.status === "connecting" ? (
                      <LoaderCircle className="h-[1.125rem] w-[1.125rem] animate-spin" />
                    ) : (
                      <Maximize2 className="h-[1.125rem] w-[1.125rem]" />
                    )}
                    {viewerState.status === "connecting"
                      ? "Connecting..."
                      : "Connect & Full Screen"}
                  </ActionButton>

                  <div className="grid grid-cols-2 gap-[0.75rem]">
                    <ActionButton
                      onClick={() =>
                        void requestElementFullscreen(viewerShellRef.current)
                      }
                      disabled={viewerState.status !== "connected"}
                      className="w-full"
                    >
                      <Maximize2 className="h-[1.125rem] w-[1.125rem]" />
                      Full Screen
                    </ActionButton>

                    <ActionButton
                      onClick={() => void handleDisconnect()}
                      disabled={
                        !connectRequested &&
                        viewerState.status === "disconnected"
                      }
                      className="w-full"
                    >
                      <Unplug className="h-[1.125rem] w-[1.125rem]" />
                      Disconnect
                    </ActionButton>
                  </div>
                </div>
              </div>
            </aside>

            <section className="min-w-0 flex-1 rounded-[2rem] bg-[#050816] p-[1rem] shadow-[0_1.75rem_4rem_rgba(15,23,42,0.24)]">
              <div className="flex h-full flex-col rounded-[1.5rem] border border-[#1D2842] bg-[#071120]">
                <div
                  ref={viewerShellRef}
                  className={
                    isViewerFullscreen
                      ? "relative h-full min-h-0 w-full overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_center,#162347_0%,#08111F_54%,#040813_100%)]"
                      : "relative min-h-0 flex-1 overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_center,#162347_0%,#08111F_54%,#040813_100%)]"
                  }
                  style={
                    isViewerFullscreen
                      ? { width: "100vw", height: "100vh" }
                      : undefined
                  }
                >
                  <div className="absolute inset-0">
                    <RemoteDesktopViewer
                      url={connectionUrl}
                      username=""
                      password={password}
                      connectRequested={connectRequested}
                      connectionNonce={connectionNonce}
                      onStatusChange={handleViewerStatusChange}
                    />
                  </div>

                  {(!connectRequested ||
                    viewerState.status !== "connected") && (
                    <div className="grid h-full min-h-0 place-items-center px-[1.5rem] py-[1.5rem]">
                      <div className="w-full max-w-[27rem] rounded-[1.75rem] border border-[#22304E] bg-[rgba(5,10,22,0.76)] p-[2.25rem] text-center shadow-[0_1.5rem_3rem_rgba(0,0,0,0.35)] backdrop-blur-[1rem]">
                        <div className="mx-auto mb-[1.25rem] grid h-[5rem] w-[5rem] place-items-center rounded-[1.5rem] bg-[#2049C7]/20 text-[#BBD0FF] ring-1 ring-[#4A73FF]/25">
                          {viewerState.status === "connecting" ? (
                            <LoaderCircle className="h-[2.5rem] w-[2.5rem] animate-spin" />
                          ) : viewerState.status === "auth-failed" ||
                            viewerState.status === "error" ? (
                            <AlertCircle className="h-[2.5rem] w-[2.5rem]" />
                          ) : (
                            <Monitor className="h-[2.5rem] w-[2.5rem]" />
                          )}
                        </div>

                        <h3 className="font-inter text-[1.625rem] font-black tracking-[-0.03em] text-white">
                          {viewerHeadline}
                        </h3>
                        <p className="mt-[0.75rem] font-inter text-[0.9375rem] leading-[1.7] text-[#C8D2E7]">
                          {viewerMessage}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {disconnectModalOpen ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(3,7,18,0.62)] px-[1rem] backdrop-blur-[0.125rem]">
          <div className="w-full max-w-[28.75rem] rounded-[1.5rem] border border-[#e4e7ec] bg-white p-[1.5rem] shadow-[0_1.5rem_4rem_rgba(2,6,23,0.24)]">
            <div className="flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-[1.125rem] bg-[#fef3f2] text-[#d92d20]">
              <AlertCircle className="h-[1.75rem] w-[1.75rem]" />
            </div>
            <h2 className="mt-[1.25rem] font-inter text-[1.5rem] font-semibold text-[#101828]">
              Device no longer connected
            </h2>
            <p className="mt-[0.5rem] font-inter text-[0.9375rem] leading-7 text-[#667085]">
              {disconnectMessage}
            </p>
            <div className="mt-[1.5rem] flex flex-wrap gap-[0.75rem]">
              <ActionButton
                onClick={() => setDisconnectModalOpen(false)}
                className="min-w-[10rem] px-[1.25rem]"
              >
                Stay on page
              </ActionButton>
              <ActionButton
                onClick={() => {
                  setDisconnectModalOpen(false);
                  onNavigateDashboard?.();
                }}
                variant="primary"
                className="min-w-[10rem] px-[1.25rem]"
              >
                Go to Dashboard
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default RemoteContent;
