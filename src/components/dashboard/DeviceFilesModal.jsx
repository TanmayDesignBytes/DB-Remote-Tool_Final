import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import ActionConfirmModal from "./ActionConfirmModal.jsx";
import {
  createFolder,
  deleteStoredFile,
  downloadStoredFile,
  listFiles,
  uploadFile,
} from "../../lib/api.js";
import { cn } from "../../lib/utils.js";

const EMPTY_LISTING = {
  folder: "",
  folders: [],
  files: [],
  totalFiles: 0,
  totalFolders: 0,
};

function FolderIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 7.75C3 6.7835 3.7835 6 4.75 6H9.2426C9.70687 6 10.1521 6.18437 10.4804 6.51256L11.4874 7.51958C11.8156 7.84777 12.2608 8.03214 12.7251 8.03214H19.25C20.2165 8.03214 21 8.81564 21 9.78214V17.25C21 18.2165 20.2165 19 19.25 19H4.75C3.7835 19 3 18.2165 3 17.25V7.75Z"
        fill="#F4C95D"
        stroke="#A16207"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function FileIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 3.75H13.6287C14.0929 3.75 14.5382 3.93437 14.8664 4.26256L18.2374 7.63356C18.5656 7.96175 18.75 8.40699 18.75 8.87126V19.25C18.75 20.2165 17.9665 21 17 21H8C7.0335 21 6.25 20.2165 6.25 19.25V5.5C6.25 4.5335 7.0335 3.75 8 3.75Z"
        fill="#EFF4FF"
        stroke="#3B82F6"
        strokeWidth="1.4"
      />
      <path
        d="M13 4V8.25H17.25"
        stroke="#3B82F6"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M20 5V9H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.3636 15C17.3636 17.3636 14.9091 19 12.0909 19C8.45455 19 5.45455 16.0909 5.45455 12.5455C5.45455 9 8.45455 6.09091 12.0909 6.09091C14.0909 6.09091 15.9091 6.90909 17.1818 8.27273L20 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M16 6V20C16 20.5523 15.5523 21 15 21H9C8.44772 21 8 20.5523 8 20V6H16ZM10 10V16M14 10V16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 19V5M12 5L6 11M12 5L18 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 16V6M12 6L8 10M12 6L16 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 18H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadProgressCircle({ progress }) {
  const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (normalizedProgress / 100) * circumference;

  return (
    <div
      className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white shadow-[0_0.5rem_1.5rem_rgba(41,112,255,0.18)]"
      role="status"
      aria-label={`Upload ${normalizedProgress}% complete`}
    >
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#E4EAF5"
          strokeWidth="4"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#2970FF"
          strokeLinecap="round"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span className="absolute font-inter text-[0.6875rem] font-bold text-[#1849A9]">
        {normalizedProgress}%
      </span>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 8V18M12 18L8 14M12 18L16 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function stripUploadsPrefix(value) {
  return String(value || "").replace(/^\/+/, "").replace(/^uploads\//, "").trim();
}

function normalizeFolderPath(value) {
  const normalized = stripUploadsPrefix(value).replace(/^\/+/, "");
  if (normalized === "root" || normalized === "/") {
    return "";
  }
  return normalized;
}

function getParentFolder(folder) {
  const parts = String(folder || "").split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "";
  }
  return parts.slice(0, -1).join("/");
}

function formatFileSize(size) {
  if (!size) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let currentSize = size;
  let unitIndex = 0;
  while (currentSize >= 1024 && unitIndex < units.length - 1) {
    currentSize /= 1024;
    unitIndex += 1;
  }
  return `${currentSize.toFixed(currentSize >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatModifiedAt(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeFolderEntry(folder, baseFolder) {
  const name =
    typeof folder === "string"
      ? folder.split("/").filter(Boolean).pop() || folder
      : folder?.name ||
        folder?.folderName ||
        folder?.folder ||
        folder?.path?.split("/")?.filter(Boolean)?.pop() ||
        "Folder";
  const rawPath = stripUploadsPrefix(
    typeof folder === "string"
      ? folder
      : folder?.path || folder?.folder || folder?.folderName || name,
  );

  return {
    id: `folder:${rawPath}`,
    name,
    path: normalizeFolderPath(
      rawPath.includes("/") ? rawPath : [baseFolder, rawPath].filter(Boolean).join("/"),
    ),
    modifiedAt: folder?.uploadDate || folder?.updatedAt || folder?.lastModified || "",
    type: "folder",
  };
}

function normalizeFileEntry(file) {
  const path = stripUploadsPrefix(
    file?.path || file?.name || file?.fileName || file?.originalName || "file",
  );

  return {
    id: `file:${path}`,
    name: file?.originalName || file?.name || "Unnamed file",
    rawName: file?.name || file?.fileName || file?.originalName || "Unnamed file",
    path,
    size: Number(file?.size || 0),
    modifiedAt: file?.uploadDate || file?.updatedAt || file?.lastModified || "",
    type: "file",
  };
}

function DeviceFilesModal({ open, device, onClose }) {
  const [listing, setListing] = useState(EMPTY_LISTING);
  const [rootFolders, setRootFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreateFolderInputFocused, setIsCreateFolderInputFocused] =
    useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDownloadingFile, setIsDownloadingFile] = useState(false);
  const [pendingDeletePath, setPendingDeletePath] = useState("");
  const [isDeletingPath, setIsDeletingPath] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedItemType, setSelectedItemType] = useState("");

  const fileInputRef = useRef(null);
  const requestIdRef = useRef(0);
  const rootRequestIdRef = useRef(0);
  const onCloseRef = useRef(onClose);
  const deviceIdentifier = String(device?.deviceIdentifier || "").trim();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const clearCenterListing = useCallback(() => {
    setCurrentFolder("");
    setListing(EMPTY_LISTING);
  }, []);

  const loadRootFolders = useCallback(async () => {
    const requestId = rootRequestIdRef.current + 1;
    rootRequestIdRef.current = requestId;

    try {
      const response = await listFiles(deviceIdentifier, "/", false);
      if (requestId !== rootRequestIdRef.current) {
        return;
      }
      const files = Array.isArray(response?.data?.files) ? response.data.files : [];
      const folders = files.filter((item) => item.isDirectory).map((item) => item.name);
      setRootFolders(folders);
    } catch {
      if (requestId !== rootRequestIdRef.current) {
        return;
      }
      setRootFolders([]);
    }
  }, [deviceIdentifier]);

  const loadFolder = useCallback(
    async (folderPath = "") => {
      const nextFolder = normalizeFolderPath(folderPath);
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await listFiles(deviceIdentifier, nextFolder, false);
        if (requestId !== requestIdRef.current) {
          return;
        }
        const allFiles = Array.isArray(response?.data?.files)
          ? response.data.files
          : [];
        const folders = allFiles
          .filter((item) => item.isDirectory)
          .map((item) => ({ name: item.name, path: item.path }));
        const files = allFiles.filter((item) => !item.isDirectory);
        const resolvedFolder = normalizeFolderPath(response?.path || nextFolder);

        setCurrentFolder(resolvedFolder);
        setListing({
          folder: resolvedFolder,
          folders,
          files,
          totalFiles: files.length,
          totalFolders: folders.length,
        });

        if (!resolvedFolder) {
          setRootFolders(folders.map((folder) => folder.name));
        }
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        const errorMsg = error?.message || "Failed to load files and folders.";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setListing(EMPTY_LISTING);
        setCurrentFolder(nextFolder);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [deviceIdentifier],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    setSearchValue("");
    setFeedbackMessage("");
    setShowCreateFolder(false);
    setNewFolderName("");
    setSelectedPath("");
    setSelectedItemType("");
    void loadRootFolders();
    clearCenterListing();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [clearCenterListing, loadRootFolders, open]);

  const normalizedFolders = useMemo(
    () => (listing.folders || []).map((folder) => normalizeFolderEntry(folder, currentFolder)),
    [currentFolder, listing.folders],
  );
  const normalizedFiles = useMemo(
    () => (listing.files || []).map((file) => normalizeFileEntry(file)),
    [listing.files],
  );

  const filteredFolders = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return normalizedFolders;
    return normalizedFolders.filter((folder) =>
      folder.name.toLowerCase().includes(query),
    );
  }, [normalizedFolders, searchValue]);

  const filteredFiles = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return normalizedFiles;
    return normalizedFiles.filter((file) =>
      `${file.name} ${file.rawName}`.toLowerCase().includes(query),
    );
  }, [normalizedFiles, searchValue]);

  const resourceFolders = useMemo(() => {
    const items = [{ label: "/root", path: "", depth: 0 }];
    const seen = new Set([""]);
    rootFolders
      .map((folder) => normalizeFolderEntry(folder, ""))
      .forEach((folder) => {
        if (seen.has(folder.path)) return;
        seen.add(folder.path);
        items.push({ label: `/${folder.name}`, path: folder.path, depth: 0 });
      });
    return items;
  }, [rootFolders]);

  const visibleFolders = useMemo(() => {
    if (!currentFolder) return [];
    return filteredFolders.filter(
      (folder) =>
        normalizeFolderPath(folder.path) !== normalizeFolderPath(currentFolder),
    );
  }, [currentFolder, filteredFolders]);

  const visibleFiles = useMemo(() => {
    if (!currentFolder) return [];
    return filteredFiles;
  }, [currentFolder, filteredFiles]);

  const canDownloadSelectedFile =
    selectedItemType === "file" && Boolean(selectedPath);

  const openFolderView = useCallback(
    (folderPath = "") => {
      const normalizedPath = normalizeFolderPath(folderPath);
      setFeedbackMessage("");
      if (!normalizedPath) {
        clearCenterListing();
        return;
      }
      void loadFolder(normalizedPath);
    },
    [clearCenterListing, loadFolder],
  );

  const handleRefresh = () => {
    setFeedbackMessage("");
    if (!currentFolder) {
      clearCenterListing();
      void loadRootFolders();
      return;
    }
    void loadFolder(currentFolder);
  };

  const handleNavigateUp = () => {
    const parentFolder = getParentFolder(currentFolder);
    if (parentFolder === currentFolder) return;
    openFolderView(parentFolder);
  };

  const handleDelete = () => {
    if (!selectedPath) {
      const errorMsg = "Please select a file or folder to delete.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return;
    }
    setPendingDeletePath(selectedPath);
  };

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName || isCreatingFolder) return;
    if (!deviceIdentifier) {
      const errorMsg = "This device is not connected yet, so folders cannot be created.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsCreatingFolder(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const basePath = currentFolder ? `/${currentFolder}` : "/root";
      const nextFolderPath = `${basePath}/${trimmedName}`.replace(/\/+/g, "/");
      const response = await createFolder(deviceIdentifier, {
        folderName: trimmedName,
        folderPath: nextFolderPath,
      });
      setNewFolderName("");
      setShowCreateFolder(false);
      setFeedbackMessage(
        response?.message || `Folder created successfully at ${nextFolderPath}.`,
      );
      await loadRootFolders();
      await loadFolder(currentFolder);
    } catch (error) {
      const errorMsg = error?.message || "Failed to create folder.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadFile = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0 || isUploadingFile) return;
    if (!deviceIdentifier) {
      const errorMsg = "This device is not connected yet, so files cannot be uploaded.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      event.target.value = "";
      return;
    }

    const destinationPath = (currentFolder ? `/${currentFolder}` : "/root").replace(/\/+$/, "/");
    const totalUploadBytes = selectedFiles.reduce(
      (total, file) => total + file.size,
      0,
    );
    let completedUploadBytes = 0;

    setIsUploadingFile(true);
    setUploadProgress(0);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("destinationpath", destinationPath);
        await uploadFile(deviceIdentifier, formData, undefined, {
          onProgress: ({ loaded }) => {
            if (!totalUploadBytes) {
              return;
            }

            setUploadProgress(
              Math.min(
                99,
                Math.round(
                  ((completedUploadBytes + loaded) / totalUploadBytes) * 100,
                ),
              ),
            );
          },
        });
        completedUploadBytes += file.size;
        setUploadProgress(
          Math.min(
            99,
            Math.round((completedUploadBytes / totalUploadBytes) * 100),
          ),
        );
      }
      setUploadProgress(100);
      setFeedbackMessage(`${selectedFiles.length} file(s) uploaded successfully to ${destinationPath}`);
      await loadRootFolders();
      await loadFolder(currentFolder);
    } catch (error) {
      const errorMsg = error?.message || "Failed to upload file.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploadingFile(false);
      window.setTimeout(() => setUploadProgress(0), 800);
      event.target.value = "";
    }
  };

  const handleDownloadSelectedFile = async () => {
    if (!canDownloadSelectedFile || isDownloadingFile) return;
    if (!deviceIdentifier) {
      const errorMsg = "This device is not connected yet, so files cannot be downloaded.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsDownloadingFile(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const normalizedFilePath = `/${String(selectedPath || "").replace(/^\/+/, "")}`;
      const { blob, fileName } = await downloadStoredFile(deviceIdentifier, {
        filePath: normalizedFilePath,
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        fileName || normalizedFilePath.split("/").pop() || "downloaded-file";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      setFeedbackMessage("File downloaded successfully.");
    } catch (error) {
      const errorMsg = error?.message || "Failed to download file.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDownloadingFile(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeletePath || isDeletingPath) return;
    if (!deviceIdentifier) {
      setErrorMessage("This device is not connected yet, so files cannot be deleted.");
      return;
    }

    setIsDeletingPath(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      await deleteStoredFile(deviceIdentifier, {
        filePath: pendingDeletePath,
        isFolder: selectedItemType === "folder",
      });
      setFeedbackMessage(
        selectedItemType === "folder"
          ? "Folder deleted successfully."
          : "File deleted successfully.",
      );
      setSearchValue("");
      setSelectedPath("");
      setSelectedItemType("");
      await loadRootFolders();
      await loadFolder(currentFolder);
      setPendingDeletePath("");
    } catch (error) {
      setErrorMessage(error?.message || "Failed to delete item.");
    } finally {
      setIsDeletingPath(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[1000] bg-[rgba(15,23,42,0.56)] backdrop-blur-[0.1875rem]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[1001]">
        <div
          className="fullscreen-tool-modal device-files-modal flex h-full w-full overflow-hidden bg-white shadow-[0_1.75rem_4.5rem_rgba(15,23,42,0.18)]"
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
                  Files
                </h2>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
              {resourceFolders.map((folder) => (
                <button
                  key={folder.path}
                  type="button"
                  onClick={() => openFolderView(folder.path)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.9375rem] font-medium transition-colors",
                    currentFolder === folder.path
                      ? "bg-[#E0EBFF] text-[#1849A9]"
                      : "text-[#344054] hover:bg-[#EEF2F6]",
                  )}
                  style={{ paddingLeft: `${0.75 + folder.depth * 0.75}rem` }}
                >
                  <FolderIcon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{folder.label}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-[#EAECF0] px-6 py-4">
              <div>
                <p className="font-inter text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#667085]">
                  Current Folder
                </p>
                <h3 className="mt-1 font-inter text-[1.25rem] font-semibold text-[#101828]">
                  {(() => {
                    const cleanedFolder = String(currentFolder || "").replace(
                      /^\/+|\/+$/g,
                      "",
                    );
                    return cleanedFolder ? `/${cleanedFolder}` : "/root";
                  })()}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-[#EAECF0] px-6 py-4">
              <button
                type="button"
                onClick={handleNavigateUp}
                disabled={!currentFolder}
                className="inline-flex items-center gap-2 rounded-[0.625rem] border border-[#D0D5DD] bg-white px-3 py-2 font-inter text-[0.875rem] font-semibold text-[#344054] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUpIcon />
                Up
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-[0.625rem] border border-[#D0D5DD] bg-white px-3 py-2 font-inter text-[0.875rem] font-semibold text-[#344054] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshIcon />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!selectedPath}
                className="inline-flex items-center gap-2 rounded-[0.625rem] border border-[#FDA29B] bg-white px-3 py-2 font-inter text-[0.875rem] font-semibold text-[#B42318] transition-colors hover:bg-[#FEF3F2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DeleteIcon />
                Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateFolder((value) => !value);
                  setErrorMessage("");
                  setFeedbackMessage("");
                }}
                className="inline-flex items-center gap-2 rounded-[0.625rem] border border-[#D0D5DD] bg-white px-3 py-2 font-inter text-[0.875rem] font-semibold text-[#344054] transition-colors hover:bg-[#F8FAFC]"
              >
                <PlusIcon />
                Create Folder
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="inline-flex items-center gap-2 rounded-[0.625rem] bg-[#2970FF] px-3 py-2 font-inter text-[0.875rem] font-semibold text-white transition-colors hover:bg-[#1F5ED4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UploadIcon />
                {isUploadingFile ? "Uploading..." : "Upload File"}
              </button>
              {isUploadingFile ? (
                <UploadProgressCircle progress={uploadProgress} />
              ) : null}
              <button
                type="button"
                onClick={handleDownloadSelectedFile}
                disabled={!canDownloadSelectedFile || isDownloadingFile}
                className="inline-flex items-center gap-2 rounded-[0.625rem] border border-[#2970FF] bg-white px-3 py-2 font-inter text-[0.875rem] font-semibold text-[#1849A9] transition-colors hover:bg-[#EEF4FF] disabled:cursor-not-allowed disabled:opacity-50"
                title={!canDownloadSelectedFile ? "Select a file to download" : "Download selected file"}
              >
                <DownloadIcon />
                {isDownloadingFile ? "Downloading..." : "Download"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleUploadFile}
              />
              <div className="ml-auto min-w-[13.75rem] flex-1 sm:max-w-[17.5rem]">
                <input
                  type="text"
                  placeholder="Search current folder"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onFocus={() => setIsSearchInputFocused(true)}
                  onBlur={() => setIsSearchInputFocused(false)}
                  className={`h-[2.625rem] w-full rounded-[0.625rem] border px-4 font-inter text-[0.875rem] text-[#1F2937] placeholder:text-[#B5BAC1] focus:outline-none focus:ring-2 focus:ring-[#2970FF]/20 ${
                    searchValue.trim() && !isSearchInputFocused
                      ? "border-[#D5DDEB] bg-[#F8FAFC]"
                      : "border-[#D0D5DD] bg-white"
                  }`}
                />
              </div>
            </div>

            {showCreateFolder ? (
              <div className="flex flex-wrap items-center gap-3 border-b border-[#EAECF0] bg-[#F8FAFC] px-6 py-4">
                <input
                  type="text"
                  placeholder="Enter folder name"
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  onFocus={() => setIsCreateFolderInputFocused(true)}
                  onBlur={() => setIsCreateFolderInputFocused(false)}
                  className={`h-[2.625rem] min-w-[13.75rem] flex-1 rounded-[0.625rem] border px-4 font-inter text-[0.875rem] text-[#1F2937] placeholder:text-[#B5BAC1] focus:outline-none focus:ring-2 focus:ring-[#2970FF]/20 ${
                    newFolderName.trim() && !isCreateFolderInputFocused
                      ? "border-[#D5DDEB] bg-[#F8FAFC]"
                      : "border-[#D0D5DD] bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="rounded-[0.625rem] bg-[#2970FF] px-4 py-2 font-inter text-[0.875rem] font-semibold text-white hover:bg-[#1F5ED4] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingFolder ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateFolder(false);
                    setNewFolderName("");
                  }}
                  className="rounded-[0.625rem] border border-[#D0D5DD] px-4 py-2 font-inter text-[0.875rem] font-semibold text-[#344054] hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mx-6 mt-4 rounded-[0.75rem] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 font-inter text-[0.875rem] font-medium text-[#B42318]">
                {errorMessage}
              </div>
            ) : null}
            {feedbackMessage ? (
              <div className="mx-6 mt-4 rounded-[0.75rem] border border-[#ABEFc6] bg-[#ECFDF3] px-4 py-3 font-inter text-[0.875rem] font-medium text-[#067647]">
                {feedbackMessage}
              </div>
            ) : null}

            <div className="flex items-center justify-between px-6 py-4 font-inter text-[0.8125rem] text-[#667085]">
              <span>{listing.totalFolders} folders</span>
              <span>{listing.totalFiles} files</span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
              <div className="overflow-hidden rounded-[0.875rem] border border-[#EAECF0]">
                <div className="grid grid-cols-[minmax(0,2.2fr)_7.5rem_7.5rem_10rem] items-center gap-4 bg-[#F8FAFC] px-5 py-3 font-inter text-[0.8125rem] font-semibold text-[#475467]">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span>Last Modified</span>
                </div>

                {isLoading ? (
                  <div className="flex min-h-[16.25rem] items-center justify-center px-5 py-8 font-inter text-[0.9375rem] font-medium text-[#667085]">
                    Loading files and folders...
                  </div>
                ) : visibleFolders.length === 0 && visibleFiles.length === 0 ? (
                  <div className="flex min-h-[16.25rem] items-center justify-center px-5 py-8 text-center font-inter text-[0.9375rem] font-medium text-[#667085]">
                    {currentFolder
                      ? "No files or folders found in this location."
                      : "Select a subfolder from the left sidebar to view its contents."}
                  </div>
                ) : (
                  <div className="divide-y divide-[#EAECF0] bg-white">
                    {visibleFolders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => {
                          setSelectedPath(folder.path);
                          setSelectedItemType("folder");
                        }}
                        onDoubleClick={() => openFolderView(folder.path)}
                        className={cn(
                          "grid cursor-pointer grid-cols-[minmax(0,2.2fr)_7.5rem_7.5rem_10rem] items-center gap-4 px-5 py-3 transition-colors",
                          selectedPath === folder.path
                            ? "bg-[#E0EBFF]"
                            : "hover:bg-[#F5F5F5]",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <FolderIcon />
                          <span className="truncate font-inter text-[0.9375rem] font-medium text-[#101828]">
                            {folder.name}
                          </span>
                        </div>
                        <span className="font-inter text-[0.875rem] text-[#667085]">
                          Folder
                        </span>
                        <span className="font-inter text-[0.875rem] text-[#667085]">
                          —
                        </span>
                        <span className="font-inter text-[0.875rem] text-[#667085]">
                          {formatModifiedAt(folder.modifiedAt)}
                        </span>
                      </div>
                    ))}
                    {visibleFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => {
                          setSelectedPath(file.path);
                          setSelectedItemType("file");
                        }}
                        className={cn(
                          "grid cursor-pointer grid-cols-[minmax(0,2.2fr)_7.5rem_7.5rem_10rem] items-center gap-4 px-5 py-3 transition-colors",
                          selectedPath === file.path
                            ? "bg-[#E0EBFF]"
                            : "hover:bg-[#F5F5F5]",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <FileIcon />
                          <span className="truncate font-inter text-[0.9375rem] font-medium text-[#101828]">
                            {file.name}
                          </span>
                        </div>
                        <span className="font-inter text-[0.875rem] text-[#667085]">
                          File
                        </span>
                        <span className="font-inter text-[0.875rem] text-[#667085]">
                          {formatFileSize(file.size)}
                        </span>
                        <span className="font-inter text-[0.875rem] text-[#667085]">
                          {formatModifiedAt(file.modifiedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ActionConfirmModal
        open={Boolean(pendingDeletePath)}
        title="Delete Item"
        message={`Delete '${selectedPath || "this item"}'?`}
        confirmLabel="Delete"
        isSubmitting={isDeletingPath}
        onClose={() => {
          if (!isDeletingPath) {
            setPendingDeletePath("");
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

export default DeviceFilesModal;
