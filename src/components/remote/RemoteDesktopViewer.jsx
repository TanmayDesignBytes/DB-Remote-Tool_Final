import React, { useCallback, useEffect, useRef } from "react";
import RFB from "@novnc/novnc";

const RfbConstructor = RFB?.default || RFB;

function RemoteDesktopViewer({
  url,
  username,
  password,
  connectRequested,
  connectionNonce,
  onStatusChange,
}) {
  const viewerRef = useRef(null);
  const rfbRef = useRef(null);
  const connectRequestedRef = useRef(connectRequested);
  const manualDisconnectRef = useRef(false);
  const credentialsRef = useRef({ username, password });

  useEffect(() => {
    credentialsRef.current = { username, password };
  }, [password, username]);

  useEffect(() => {
    connectRequestedRef.current = connectRequested;
  }, [connectRequested]);

  const updateStatus = useCallback(
    (status, meta = {}) => {
      onStatusChange?.({ status, ...meta });
    },
    [onStatusChange],
  );

  const clearSurface = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.replaceChildren();
    }
  }, []);

  const forceVisibleCursor = useCallback(() => {
    if (!viewerRef.current) {
      return;
    }

    viewerRef.current.style.cursor = "default";

    viewerRef.current.querySelectorAll("canvas, div").forEach((node) => {
      node.style.cursor = "default";
    });
  }, []);

  const destroyRfb = useCallback(
    (shouldDisconnectSocket = true) => {
      const activeRfb = rfbRef.current;

      if (!activeRfb) {
        clearSurface();
        return;
      }

      rfbRef.current = null;

      if (shouldDisconnectSocket) {
        try {
          activeRfb.disconnect();
        } catch {
          // Ignore cleanup errors from noVNC disconnects.
        }
      }

      clearSurface();
    },
    [clearSurface],
  );

  const connectToServer = useCallback(() => {
    if (!viewerRef.current || !url || rfbRef.current || !connectRequestedRef.current) {
      return;
    }

    manualDisconnectRef.current = false;
    clearSurface();
    updateStatus("connecting");

    try {
      const nextCredentials = {};

      if (credentialsRef.current.username) {
        nextCredentials.username = credentialsRef.current.username;
      }

      if (credentialsRef.current.password) {
        nextCredentials.password = credentialsRef.current.password;
      }

      const rfb = new RfbConstructor(viewerRef.current, url, {
        shared: true,
        credentials:
          Object.keys(nextCredentials).length > 0 ? nextCredentials : undefined,
      });

      rfb.scaleViewport = true;
      rfb.clipViewport = false;
      rfb.resizeSession = false;
      rfb.showDotCursor = true;
      rfb.background = "#040712";
      rfb.viewOnly = false;
      forceVisibleCursor();

      rfb.addEventListener("connect", () => {
        forceVisibleCursor();
        updateStatus("connected");
      });

      rfb.addEventListener("credentialsrequired", (event) => {
        const requestedTypes = event?.detail?.types || [];
        const suppliedCredentials = {};

        if (requestedTypes.length === 0 || requestedTypes.includes("password")) {
          if (credentialsRef.current.password) {
            suppliedCredentials.password = credentialsRef.current.password;
          }
        }

        if (requestedTypes.includes("username") && credentialsRef.current.username) {
          suppliedCredentials.username = credentialsRef.current.username;
        }

        if (!Object.keys(suppliedCredentials).length) {
          manualDisconnectRef.current = true;
          updateStatus("auth-failed", {
            message: "Remote screen credentials are required.",
          });
          destroyRfb(true);
          return;
        }

        rfb.sendCredentials(suppliedCredentials);
      });

      rfb.addEventListener("securityfailure", (event) => {
        manualDisconnectRef.current = true;
        updateStatus("auth-failed", {
          message: event?.detail?.reason || "Authentication failed.",
        });
        destroyRfb(true);
      });

      rfb.addEventListener("disconnect", (event) => {
        const clean = event?.detail?.clean ?? false;
        const unexpected = !manualDisconnectRef.current && connectRequestedRef.current;

        destroyRfb(false);
        updateStatus("disconnected", {
          clean,
          unexpected,
          message: unexpected
            ? "The device no longer appears to be connected."
            : "",
        });
      });

      rfbRef.current = rfb;
    } catch (error) {
      updateStatus("error", {
        unexpected: true,
        message: error?.message || "Unable to start the remote screen session.",
      });
      destroyRfb(false);
    }
  }, [clearSurface, destroyRfb, forceVisibleCursor, updateStatus, url]);

  useEffect(() => {
    if (connectRequested) {
      connectToServer();
      return undefined;
    }

    manualDisconnectRef.current = true;
    destroyRfb(true);
    updateStatus("disconnected", { clean: true, manual: true });

    return undefined;
  }, [connectRequested, connectionNonce, connectToServer, destroyRfb, updateStatus]);

  useEffect(() => {
    return () => {
      manualDisconnectRef.current = true;
      destroyRfb(true);
    };
  }, [destroyRfb]);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[1.625rem] border border-[#1c2740] bg-[#040712] shadow-[0_1.5rem_3.75rem_rgba(3,7,18,0.35)]">
      <div
        ref={viewerRef}
        className="h-full w-full overflow-hidden bg-[#040712]"
        style={{ cursor: "default" }}
        aria-label="Remote screen canvas"
      />
    </div>
  );
}

export default RemoteDesktopViewer;
