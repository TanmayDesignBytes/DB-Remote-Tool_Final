import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL, sendTerminalCommand } from "../../lib/api.js";

function formatPrompt(session) {
  const host =
    String(session?.hostname || "raspberrypi")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "")
      .slice(0, 20) || "raspberrypi";
  const user = session?.username || "pi";
  const cwd = session?.cwd || `/home/${user}`;
  const short = cwd.startsWith(`/home/${user}`)
    ? cwd.replace(`/home/${user}`, "~")
    : cwd;

  return {
    prompt: `\u001b[1;32m${user}@${host}\u001b[0m:\u001b[1;34m${short}\u001b[0m $ `,
  };
}

function extractOutput(response) {
  const candidates = [
    response?.output,
    response?.stdout,
    response?.result,
    response?.response,
    response?.data?.output,
    response?.data?.stdout,
    response?.data?.result,
    response?.data?.response,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (Array.isArray(candidate) && candidate.length) return candidate.join("\r\n");
  }

  return "";
}

function stripAnsi(text) {
  return String(text || "")
    .replace(/\u001b\][^\u0007]*\u0007/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-_]/g, "")
    .replace(/\u0007/g, "");
}

function looksLikeShellPrompt(text) {
  const plain = stripAnsi(text).replace(/\r/g, "");
  return /\w+@\w+:[^\n]*[$#]\s*$/.test(plain);
}

function extractLatestPrompt(text) {
  const plain = stripAnsi(text).replace(/\r/g, "");
  const lines = plain.split("\n");

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trimEnd();
    if (/^\w+@\w+:[^\n]*[$#]\s*$/.test(line)) {
      return `${line} `;
    }
  }

  return "";
}

function stripEcho(output, command) {
  if (!output || !command) return output;
  const lines = output.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() === command.trim()) {
    return lines.slice(1).join("\n").replace(/^\n+/, "").replace(/\n/g, "\r\n");
  }
  return output;
}

function prepareRemoteCommand(command, isTui) {
  if (!isTui) return command;
  if (/\bTERM=/.test(command)) return command;
  return `export TERM=xterm && ${command}`;
}

function buildTerminalSocketUrl(deviceIdentifier) {
  if (!deviceIdentifier) return "";

  const baseOrigin = API_BASE_URL.replace(/\/api$/, "");
  const resolvedOrigin =
    /^https?:\/\//i.test(baseOrigin)
      ? baseOrigin
      : typeof window !== "undefined"
        ? new URL(baseOrigin || "/", window.location.origin).toString()
        : "";

  try {
    const url = new URL(resolvedOrigin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `/terminal/${encodeURIComponent(deviceIdentifier)}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

const CONTROL_MAP = {
  CTRL_A: "\x01",
  CTRL_B: "\x02",
  CTRL_C: "\x03",
  CTRL_D: "\x04",
  CTRL_E: "\x05",
  CTRL_F: "\x06",
  CTRL_G: "\x07",
  CTRL_H: "\x08",
  CTRL_I: "\x09",
  CTRL_J: "\x0a",
  CTRL_K: "\x0b",
  CTRL_L: "\x0c",
  CTRL_M: "\x0d",
  CTRL_N: "\x0e",
  CTRL_O: "\x0f",
  CTRL_P: "\x10",
  CTRL_Q: "\x11",
  CTRL_R: "\x12",
  CTRL_S: "\x13",
  CTRL_T: "\x14",
  CTRL_U: "\x15",
  CTRL_V: "\x16",
  CTRL_W: "\x17",
  CTRL_X: "\x18",
  CTRL_Y: "\x19",
  CTRL_Z: "\x1a",
  CTRL_BACKSLASH: "\x1c",
  CTRL_SLASH: "\x1f",
};

const ARROW_KEYS = {
  UP: "\x1b[A",
  DOWN: "\x1b[B",
  RIGHT: "\x1b[C",
  LEFT: "\x1b[D",
};

const SPECIAL_KEY_MAP = {
  ESC: "\x1b",
  DELETE: "\x1b[3~",
  INSERT: "\x1b[2~",
  HOME: "\x1b[H",
  END: "\x1b[F",
  PAGE_UP: "\x1b[5~",
  PAGE_DOWN: "\x1b[6~",
};

const FUNCTION_KEY_MAP = {
  F1: "\x1bOP",
  F2: "\x1bOQ",
  F3: "\x1bOR",
  F4: "\x1bOS",
  F5: "\x1b[15~",
  F6: "\x1b[17~",
  F7: "\x1b[18~",
  F8: "\x1b[19~",
  F9: "\x1b[20~",
  F10: "\x1b[21~",
  F11: "\x1b[23~",
  F12: "\x1b[24~",
};

const MODIFIED_ARROW_KEYS = {
  SHIFT_UP: "\x1b[1;2A",
  SHIFT_DOWN: "\x1b[1;2B",
  SHIFT_RIGHT: "\x1b[1;2C",
  SHIFT_LEFT: "\x1b[1;2D",
  CTRL_UP: "\x1b[1;5A",
  CTRL_DOWN: "\x1b[1;5B",
  CTRL_RIGHT: "\x1b[1;5C",
  CTRL_LEFT: "\x1b[1;5D",
};

const ALT_KEY_MAP = {
  ALT_A: "\x1ba",
  ALT_B: "\x1bb",
  ALT_C: "\x1bc",
  ALT_D: "\x1bd",
  ALT_F: "\x1bf",
  ALT_BACKSPACE: "\x1b\x7f",
};

function getCtrlSequence(event) {
  const key = event.key;
  const code = String(event.code || "");

  if (key === "\\") return CONTROL_MAP.CTRL_BACKSLASH;
  if (key === "/") return CONTROL_MAP.CTRL_SLASH;
  if (code === "Backslash") return CONTROL_MAP.CTRL_BACKSLASH;
  if (code === "Slash") return CONTROL_MAP.CTRL_SLASH;

  const upper = String(key || "").toUpperCase();
  if (CONTROL_MAP[`CTRL_${upper}`]) return CONTROL_MAP[`CTRL_${upper}`];

  if (code.startsWith("Key")) {
    const codeLetter = code.slice(3).toUpperCase();
    return CONTROL_MAP[`CTRL_${codeLetter}`] || null;
  }

  return null;
}

function getModifiedArrowSequence(event) {
  const key = String(event.key || "").replace(/^Arrow/, "").toUpperCase();

  if (!ARROW_KEYS[key]) return null;
  if (event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
    return MODIFIED_ARROW_KEYS[`SHIFT_${key}`] || null;
  }
  if (event.ctrlKey && !event.altKey && !event.metaKey) {
    return MODIFIED_ARROW_KEYS[`CTRL_${key}`] || null;
  }

  return null;
}

function getSpecialSequence(event) {
  const key = String(event.key || "");
  const upper = key.toUpperCase();

  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    if (upper === "BACKSPACE") return ALT_KEY_MAP.ALT_BACKSPACE;
    return ALT_KEY_MAP[`ALT_${upper}`] || null;
  }

  if (upper === " ") return "\x20";

  return SPECIAL_KEY_MAP[upper] || FUNCTION_KEY_MAP[upper] || null;
}

export default function DeviceTerminalModal({ open, device, onClose }) {
  const terminalHostRef = useRef(null);
  const cmdBufRef = useRef("");
  const cursorPosRef = useRef(0);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const historyDraftRef = useRef("");
  const interactiveRef = useRef(false);
  const termRef = useRef(null);
  const promptRef = useRef("");
  const socketRef = useRef(null);
  const socketReadyRef = useRef(false);
  const socketExpectedRef = useRef(false);
  const socketQueueRef = useRef([]);
  const pendingEchoRef = useRef("");
  const terminalClosedSentRef = useRef(false);
  const lastSocketOutboundRef = useRef(null);
  const lastSocketInboundRef = useRef(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const notifyTerminalClosed = () => {
    const socket = socketRef.current;

    if (
      terminalClosedSentRef.current ||
      !socket ||
      !device?.deviceIdentifier ||
      socket.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "terminal_closed",
        deviceId: device.deviceIdentifier,
        source: "frontend",
      }),
    );
    terminalClosedSentRef.current = true;
  };

  useEffect(() => {
    if (!open || !terminalHostRef.current || !device) return undefined;

    let disposed = false;
    let teardown = () => {};

    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/xterm/css/xterm.css"),
      ]);

      if (disposed || !terminalHostRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        scrollback: 2000,
        fontFamily: '"Courier New", Consolas, monospace',
        fontSize: 15,
        lineHeight: 1.2,
        cursorStyle: "block",
        theme: {
          background: "#000000",
          foreground: "#f5f5f5",
          cursor: "#19ff19",
          cursorAccent: "#19ff19",
          selectionBackground: "rgba(255,255,255,0.18)",
          black: "#000000",
          brightBlack: "#666666",
          red: "#ff6b6b",
          brightRed: "#ff8e8e",
          green: "#00d700",
          brightGreen: "#19ff19",
          yellow: "#ffff5f",
          brightYellow: "#ffff87",
          blue: "#5f87ff",
          brightBlue: "#87afff",
          magenta: "#d787ff",
          brightMagenta: "#ffafff",
          cyan: "#5fffff",
          brightCyan: "#87ffff",
          white: "#d9d9d9",
          brightWhite: "#ffffff",
        },
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(terminalHostRef.current);
      fit.fit();
      term.focus();
      termRef.current = term;
      promptRef.current = formatPrompt(null).prompt;
      term.write(promptRef.current);

      const writeOutput = (raw) => {
        if (raw) term.write(raw);
      };

      const renderBufferedLine = () => {
        const buffer = cmdBufRef.current;
        const cursorPos = cursorPosRef.current;
        const moveLeft = buffer.length - cursorPos;

        term.write(`\r\x1b[2K${promptRef.current}${buffer}`);
        if (moveLeft > 0) {
          term.write(`\x1b[${moveLeft}D`);
        }
      };

      const resetShellBuffer = () => {
        cmdBufRef.current = "";
        cursorPosRef.current = 0;
        historyIndexRef.current = -1;
        historyDraftRef.current = "";
      };

      const pushHistory = (command) => {
        const value = String(command || "").trim();
        if (!value) return;
        const history = historyRef.current;
        if (history[history.length - 1] !== value) {
          history.push(value);
        }
        historyIndexRef.current = -1;
        historyDraftRef.current = "";
      };

      const stepHistory = (direction) => {
        const history = historyRef.current;
        if (history.length === 0) return;

        if (direction < 0) {
          if (historyIndexRef.current === -1) {
            historyDraftRef.current = cmdBufRef.current;
            historyIndexRef.current = history.length - 1;
          } else if (historyIndexRef.current > 0) {
            historyIndexRef.current -= 1;
          }
        } else {
          if (historyIndexRef.current === -1) return;

          if (historyIndexRef.current < history.length - 1) {
            historyIndexRef.current += 1;
          } else {
            historyIndexRef.current = -1;
            cmdBufRef.current = historyDraftRef.current;
            cursorPosRef.current = cmdBufRef.current.length;
            renderBufferedLine();
            return;
          }
        }

        if (historyIndexRef.current >= 0) {
          cmdBufRef.current = history[historyIndexRef.current] || "";
          cursorPosRef.current = cmdBufRef.current.length;
          renderBufferedLine();
        }
      };

      const getSocket = () =>
        socketRef.current &&
        socketReadyRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
          ? socketRef.current
          : null;

      const sendSocketMessage = (payload) => {
        const socket = getSocket();
        if (!socket) return false;
        lastSocketOutboundRef.current = payload;
        socket.send(JSON.stringify(payload));
        return true;
      };

      const sendOrQueueSocketMessage = (payload) => {
        if (sendSocketMessage(payload)) return true;
        if (!socketExpectedRef.current) return false;
        socketQueueRef.current.push(payload);
        return true;
      };

      const flushSocketQueue = () => {
        const socket = getSocket();
        if (!socket || socketQueueRef.current.length === 0) return;
        const queued = [...socketQueueRef.current];
        socketQueueRef.current = [];
        queued.forEach((payload) => socket.send(JSON.stringify(payload)));
      };

      const notifyTerminalLifecycle = (type) => {
        sendSocketMessage({
          type,
          deviceId: device.deviceIdentifier,
          source: "frontend",
        });
        if (type === "terminal_closed") {
          terminalClosedSentRef.current = true;
        }
      };

      const handleSocketOutput = (raw) => {
        if (!raw || raw === "Timeout") return;

        let output = raw;
        if (pendingEchoRef.current) {
          output = stripEcho(output, pendingEchoRef.current);
          pendingEchoRef.current = "";
        }

        if (looksLikeShellPrompt(output)) {
          interactiveRef.current = false;
          resetShellBuffer();
          const detectedPrompt = extractLatestPrompt(output);
          if (detectedPrompt) {
            promptRef.current = detectedPrompt;
          }
        }

        writeOutput(output);
      };

      const socketUrl = buildTerminalSocketUrl(device.deviceIdentifier);
      if (socketUrl) {
        socketExpectedRef.current = true;
        try {
          const socket = new WebSocket(socketUrl);
          socketRef.current = socket;

          socket.addEventListener("open", () => {
            socketReadyRef.current = true;
            lastSocketInboundRef.current = { type: "socket_open" };
            notifyTerminalLifecycle("terminal_started");
            flushSocketQueue();
          });

          socket.addEventListener("message", (event) => {
            try {
              const data = JSON.parse(event.data);
              lastSocketInboundRef.current = data;

              if (data?.type === "terminal_output") {
                handleSocketOutput(data.data || "");
                return;
              }

              if (data?.type === "terminal_exit") {
                interactiveRef.current = false;
                resetShellBuffer();
                pendingEchoRef.current = "";
              }
            } catch (error) {
              console.error("Terminal websocket parse error", error);
            }
          });

          socket.addEventListener("close", (event) => {
            socketReadyRef.current = false;
            socketRef.current = null;
            term.write(
              `\r\n[Terminal socket closed code=${event.code} reason=${event.reason || "(no reason)"} clean=${event.wasClean}]\r\n`,
            );
          });

          socket.addEventListener("error", (error) => {
            console.error("Terminal websocket error", {
              error,
              lastOutbound: lastSocketOutboundRef.current,
              lastInbound: lastSocketInboundRef.current,
            });
            term.write("\r\n[Terminal socket error]\r\n");
          });
        } catch (error) {
          console.error("Terminal websocket init error", error);
        }
      }

      const sendRaw = async (sequence) => {
        if (!device.deviceIdentifier) return;

        if (sendOrQueueSocketMessage({ type: "terminal_input", command: sequence })) {
          return;
        }

        try {
          const response = await sendTerminalCommand(
            device.deviceIdentifier,
            sequence,
            true,
          );
          const output = extractOutput(response);
          if (!output || output === "Timeout") return;

          if (looksLikeShellPrompt(output)) {
            interactiveRef.current = false;
            resetShellBuffer();
            writeOutput(output);
            term.write(`\r\n${promptRef.current}`);
            return;
          }

          writeOutput(output);
        } catch (error) {
          console.error("sendRaw error", error);
        }
      };

      const runCommand = async (rawCommand) => {
        const command = rawCommand.trim();

        if (!command) {
          term.write(`\r\n${promptRef.current}`);
          return;
        }

        if (command === "clear") {
          term.write("\u001b[2J\u001b[3J\u001b[H");
          term.write(promptRef.current);
          return;
        }

        if (command === "exit") {
          onClose?.();
          return;
        }

        if (!device.deviceIdentifier) {
          term.write(`\r\nDevice agent id is missing.\r\n${promptRef.current}`);
          return;
        }

        const isTui = /^(nano|vim|vi|less|more|top|htop|man)\b/.test(command);
        if (isTui) interactiveRef.current = true;
        const remoteCommand = prepareRemoteCommand(command, isTui);

        if (
          sendOrQueueSocketMessage({
            type: "execute_command",
            command: remoteCommand,
          })
        ) {
          pendingEchoRef.current = remoteCommand;
          term.write("\r\n");
          return;
        }

        try {
          const response = await sendTerminalCommand(
            device.deviceIdentifier,
            remoteCommand,
            false,
          );
          const rawOutput = extractOutput(response);

          if (!rawOutput || rawOutput === "Timeout") {
            if (!interactiveRef.current) {
              term.write(`\r\n${promptRef.current}`);
            }
            return;
          }

          if (isTui) {
            writeOutput(rawOutput);
          } else {
            const cleaned = stripEcho(rawOutput, remoteCommand);
            term.write("\r\n");
            writeOutput(cleaned);
            if (!/[\r\n]$/.test(cleaned)) {
              term.write("\r\n");
            }
            term.write(promptRef.current);
          }
        } catch (error) {
          term.write(
            `\r\n${error?.message || "Command failed."}\r\n${promptRef.current}`,
          );
          interactiveRef.current = false;
        }
      };

      term.attachCustomKeyEventHandler((event) => {
        if (event.type !== "keydown") return true;

        if (String(event.key || "").toUpperCase() === "TAB") {
          event.preventDefault();
          if (interactiveRef.current) {
            void sendRaw("\x09");
          }
          return false;
        }

        const modifiedArrowSequence = getModifiedArrowSequence(event);
        if (modifiedArrowSequence) {
          if (!interactiveRef.current) {
            event.preventDefault();
            return false;
          }
          event.preventDefault();
          void sendRaw(modifiedArrowSequence);
          return false;
        }

        const eventKey = String(event.key || "").replace(/^Arrow/, "").toUpperCase();
        const arrowSequence = ARROW_KEYS[eventKey];
        if (
          arrowSequence &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          if (!interactiveRef.current) {
            event.preventDefault();
            if (eventKey === "LEFT" && cursorPosRef.current > 0) {
              cursorPosRef.current -= 1;
              term.write("\x1b[D");
            } else if (
              eventKey === "RIGHT" &&
              cursorPosRef.current < cmdBufRef.current.length
            ) {
              cursorPosRef.current += 1;
              term.write("\x1b[C");
            } else if (eventKey === "UP") {
              stepHistory(-1);
            } else if (eventKey === "DOWN") {
              stepHistory(1);
            }
            return false;
          }

          event.preventDefault();
          void sendRaw(arrowSequence);
          return false;
        }

        const specialSequence = getSpecialSequence(event);
        if (specialSequence) {
          const upperKey = String(event.key || "").toUpperCase();
          if (upperKey === " " && !interactiveRef.current) {
            return true;
          }

          event.preventDefault();
          void sendRaw(specialSequence);
          return false;
        }

        if (!event.ctrlKey || event.altKey || event.metaKey) {
          return true;
        }

        const controlSequence = getCtrlSequence(event);
        if (!controlSequence) return true;
        event.preventDefault();

        if (controlSequence === CONTROL_MAP.CTRL_C && !interactiveRef.current) {
          resetShellBuffer();
          term.write(`^C\r\n${promptRef.current}`);
        } else {
          void sendRaw(controlSequence);
        }

        return false;
      });

      const dataSub = term.onData((data) => {
        if (!device.deviceIdentifier) return;

        if (socketExpectedRef.current && interactiveRef.current) {
          if (data === "\u007f" || data === "\b") {
            void sendRaw("\x7f");
            return;
          }
          void sendRaw(data);
          return;
        }

        if (interactiveRef.current) {
          void sendRaw(data);
          return;
        }

        if (data === "\r") {
          const command = cmdBufRef.current;
          pushHistory(command);
          cmdBufRef.current = "";
          cursorPosRef.current = 0;
          historyIndexRef.current = -1;
          historyDraftRef.current = "";
          void runCommand(command);
          return;
        }

        if (data === "\u007f" || data === "\b") {
          if (cursorPosRef.current > 0) {
            const cursorPos = cursorPosRef.current;
            cmdBufRef.current =
              cmdBufRef.current.slice(0, cursorPos - 1) +
              cmdBufRef.current.slice(cursorPos);
            cursorPosRef.current -= 1;
            renderBufferedLine();
          }
          return;
        }

        if (data === "\t" || data.startsWith("\u001b")) return;

        if (data >= " " && data !== "\u007f") {
          const cursorPos = cursorPosRef.current;
          cmdBufRef.current =
            cmdBufRef.current.slice(0, cursorPos) +
            data +
            cmdBufRef.current.slice(cursorPos);
          cursorPosRef.current += data.length;
          renderBufferedLine();
        }
      });

      const onResize = () => fit.fit();
      window.addEventListener("resize", onResize);

      teardown = () => {
        dataSub.dispose();
        window.removeEventListener("resize", onResize);
        socketReadyRef.current = false;
        pendingEchoRef.current = "";
        if (socketRef.current) {
          try {
            if (socketRef.current.readyState === WebSocket.OPEN) {
              notifyTerminalClosed();
            }
            socketRef.current.close();
          } catch {
            // no-op
          }
          socketRef.current = null;
        }
        term.dispose();
        termRef.current = null;
        resetShellBuffer();
        interactiveRef.current = false;
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, [device, onClose, open]);

  if (!open || !device) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-[rgba(3,7,18,0.56)] px-3 py-4 backdrop-blur-[0.125rem] sm:px-4 sm:py-5"
      onClick={() => setConfirmClose(true)}
    >
      <div
        className="flex h-[min(78dvh,38.75rem)] w-full max-w-[min(92vw,56.25rem)] flex-col overflow-hidden rounded-[0.625rem] border border-[#7ba9d8] bg-[#000000] shadow-[0_1.75rem_4.375rem_rgba(2,6,23,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#7ba9d8] bg-[#86b6e8] px-4 py-2">
          <div>
            <p className="font-['Poppins'] text-[0.875rem] font-semibold text-[#08111f]">
              {device.title || device.name} SSH Console
            </p>
            <p className="text-[0.625rem] text-[#163252]">
              Remote terminal session
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmClose(true)}
            className="rounded border border-[#4e7aa8] bg-[#dcecff] px-2.5 py-1 text-[0.6875rem] font-medium text-[#163252] transition-colors hover:bg-[#c9e0fb]"
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#163252] bg-[#050505] px-4 py-2 text-[0.625rem] text-[#bbbbbb]">
          <span className="rounded border border-[#1f1f1f] bg-[#0c0c0c] px-2 py-1">
            Group: {device.group}
          </span>
          <span className="rounded border border-[#1f1f1f] bg-[#0c0c0c] px-2 py-1">
            Location: {device.location}
          </span>
          <span className="rounded border border-[#1f1f1f] bg-[#0c0c0c] px-2 py-1">
            Status: {device.status}
          </span>
        </div>

        <div className="min-h-0 flex-1 bg-[#000000] p-0">
          <div
            ref={terminalHostRef}
            className="h-full w-full overflow-hidden bg-[#000000] p-2"
          />
        </div>
      </div>

      {confirmClose ? (
        <div
          className="fixed inset-0 z-[1002] flex items-center justify-center bg-[rgba(3,7,18,0.8)] backdrop-blur-[0.125rem]"
          onClick={() => setConfirmClose(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-[0.625rem] border border-[#7ba9d8] bg-[#0d1622] p-6 shadow-[0_1.75rem_4.375rem_rgba(2,6,23,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2 className="font-['Poppins'] text-[1rem] font-semibold text-[#e8ecf1]">
                Close Terminal?
              </h2>
              <p className="mt-2 text-[0.8125rem] text-[#a8aeb8]">
                Are you sure you want to close this terminal session?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="flex-1 rounded border border-[#4e7aa8] bg-[#1a2942] px-4 py-2 text-[0.8125rem] font-medium text-[#86b6e8] transition-colors hover:bg-[#253a52]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  notifyTerminalClosed();
                  setConfirmClose(false);
                  onClose?.();
                }}
                className="flex-1 rounded border border-[#d74646] bg-[#8b2c2c] px-4 py-2 text-[0.8125rem] font-medium text-[#ff8a8a] transition-colors hover:bg-[#a63c3c]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
