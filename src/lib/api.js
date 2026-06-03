const DEFAULT_API_BASE_URL = "/api";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");

function getStoredAuthToken() {
  return (
    window.localStorage.getItem("dws.auth.token") ||
    window.sessionStorage.getItem("dws.auth.session.token") ||
    ""
  );
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function apiRequest(path, options = {}) {
  const { method = "GET", body, token, headers = {}, ...rest } = options;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    ...rest,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data?.message
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data;
}

export function loginUser(payload) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function signupUser(payload) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export function forgotPassword(payload) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export function resetPassword(payload) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

export function logoutUser(token = getStoredAuthToken()) {
  return apiRequest("/auth/logout", {
    method: "POST",
    token,
  });
}

export function getUserInfo(token = getStoredAuthToken()) {
  return apiRequest("/auth/info", {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    token,
  });
}

export function searchDevices(query, token = getStoredAuthToken()) {
  const params = new URLSearchParams({ q: query });

  return apiRequest(`/device/search?${params.toString()}`, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    token,
  });
}

export function getMyDevices(token = getStoredAuthToken()) {
  return apiRequest("/device/my-devices", {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    token,
  });
}

export function generateDeviceCode(payload, token = getStoredAuthToken()) {
  return apiRequest("/device/generate-code", {
    method: "POST",
    body: payload,
    token,
  });
}

export function deleteDevice(id, token = getStoredAuthToken()) {
  return apiRequest(`/device/delete/${id}`, {
    method: "DELETE",
    token,
  });
}

export function toggleDevice(id, payload, token = getStoredAuthToken()) {
  return apiRequest(`/device/${id}/toggle`, {
    method: "PATCH",
    body: payload,
    token,
  });
}

export function updateDeviceDetails(
  id,
  payload,
  token = getStoredAuthToken(),
) {
  return apiRequest(`/device/device/${id}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function rebootAgent(
  deviceIdentifier,
  token = getStoredAuthToken(),
) {
  return apiRequest(
    `/device/reboot-agent/${encodeURIComponent(deviceIdentifier)}`,
    {
      method: "POST",
      token,
    },
  );
}

export function rebootOperatingSystem(
  deviceIdentifier,
  token = getStoredAuthToken(),
) {
  return apiRequest(
    `/device/reboot-os/${encodeURIComponent(deviceIdentifier)}`,
    {
      method: "POST",
      token,
    },
  );
}

export function logResourcesOpened(
  deviceIdentifier,
  token = getStoredAuthToken(),
) {
  return apiRequest(
    `/files/${encodeURIComponent(deviceIdentifier)}/resources`,
    {
      method: "POST",
      body: { action: "opened" },
      token,
    },
  );
}

export function getResources(
  deviceIdentifier,
  token = getStoredAuthToken(),
) {
  return apiRequest(
    `/files/${encodeURIComponent(deviceIdentifier)}/resources`,
    {
      method: "GET",
      token,
    },
  );
}

export function sendResourceAction(
  deviceIdentifier,
  action,
  token = getStoredAuthToken(),
) {
  return apiRequest(
    `/files/${encodeURIComponent(deviceIdentifier)}/resources`,
    {
      method: "POST",
      body: { action },
      token,
    },
  );
}

export function listFiles(
  deviceIdentifier,
  path = "/",
  recursive = false,
  token = getStoredAuthToken(),
) {
  const normalizedPath = path ? `/${path}`.replace(/\/+/g, "/") : "/";

  return apiRequest(
    `/files/${encodeURIComponent(deviceIdentifier)}/list-files`,
    {
      method: "POST",
      body: { path: normalizedPath, recursive },
      token,
    },
  );
}

export function createFolder(
  deviceIdentifier,
  payload,
  token = getStoredAuthToken(),
) {
  const normalizedPayload = {
    ...payload,
    folderPath: payload.folderPath
      ? `/${payload.folderPath}`.replace(/\/+/g, "/")
      : "/",
  };

  return apiRequest(
    `/files/${encodeURIComponent(deviceIdentifier)}/create-folder`,
    {
      method: "POST",
      body: normalizedPayload,
      token,
    },
  );
}

export function uploadFile(
  deviceIdentifier,
  formData,
  token = getStoredAuthToken(),
  options = {},
) {
  const { onProgress } = options;
  const normalizedFormData = new FormData();
  for (const [key, value] of formData.entries()) {
    if (key === "destinationpath" && typeof value === "string") {
      normalizedFormData.append(key, value.replace(/\/+/g, "/"));
      continue;
    }
    normalizedFormData.append(key, value);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${API_BASE_URL}/files/${encodeURIComponent(deviceIdentifier)}/upload-file`,
    );

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== "function") {
        return;
      }

      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader("content-type") || "";
      let data = xhr.responseText;

      if (contentType.includes("application/json") && xhr.responseText) {
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = xhr.responseText;
        }
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const message =
          typeof data === "object" && data?.message
            ? data.message
            : xhr.status === 413
              ? "File is too large for the server upload limit."
              : `Request failed with status ${xhr.status}`;

        reject(new ApiError(message, xhr.status, data));
        return;
      }

      resolve(data);
    };

    xhr.onerror = () => {
      reject(new ApiError("Network error while uploading file.", 0, null));
    };

    xhr.onabort = () => {
      reject(new ApiError("Upload was cancelled.", 0, null));
    };

    xhr.send(normalizedFormData);
  });
}

export function deleteStoredFile(
  deviceIdentifier,
  payload,
  token = getStoredAuthToken(),
) {
  const normalizedPayload = {
    ...payload,
    filePath: payload.filePath
      ? String(payload.filePath).replace(/\/+/g, "/")
      : payload.filePath,
  };

  return apiRequest(`/files/${encodeURIComponent(deviceIdentifier)}/delete`, {
    method: "DELETE",
    body: normalizedPayload,
    token,
  });
}

export async function downloadStoredFile(
  deviceIdentifier,
  payload,
  token = getStoredAuthToken(),
) {
  const normalizedPayload = {
    ...payload,
    filePath: payload?.filePath
      ? `/${String(payload.filePath)}`.replace(/\/+/, "/").replace(/\/{2,}/g, "/")
      : payload?.filePath,
  };

  const response = await fetch(
    `${API_BASE_URL}/files/${encodeURIComponent(deviceIdentifier)}/download`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(normalizedPayload),
    },
  );

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    const message =
      typeof data === "object" && data?.message
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") || "";
  const utf8FileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  const basicFileNameMatch = contentDisposition.match(/filename=(?:\"([^\"]+)\"|([^;]+))/i);

  const fileName = utf8FileNameMatch?.[1]
    ? decodeURIComponent(utf8FileNameMatch[1])
    : basicFileNameMatch?.[1] || basicFileNameMatch?.[2] || "";

  return { blob, fileName };
}

export function sendTerminalCommand(
  deviceIdentifier,
  command,
  isRawKey = false,
  token = getStoredAuthToken(),
) {
  return apiRequest(`/device/command/${encodeURIComponent(deviceIdentifier)}`, {
    method: "POST",
    body: { command, isRawKey },
    token,
  });
}

export function updateProfile(payload, token = getStoredAuthToken()) {
  return apiRequest("/update/profile", {
    method: "PUT",
    body: payload,
    token,
  });
}

export function sendEmailOtp(payload, token = getStoredAuthToken()) {
  return apiRequest("/email/send-otp", {
    method: "POST",
    body: payload,
    token,
  });
}

export function verifyEmailOtp(payload, token = getStoredAuthToken()) {
  return apiRequest("/email/verify-otp", {
    method: "POST",
    body: payload,
    token,
  });
}

export function createGroup(payload, token = getStoredAuthToken()) {
  return apiRequest("/group/create", {
    method: "POST",
    body: payload,
    token,
  });
}

export function getGroups(token = getStoredAuthToken()) {
  return apiRequest("/group", {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    token,
  });
}

export function updateGroup(id, payload, token = getStoredAuthToken()) {
  return apiRequest(`/group/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function deleteGroup(id, token = getStoredAuthToken()) {
  return apiRequest(`/group/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
}
