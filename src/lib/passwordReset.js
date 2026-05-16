export function getResetTokenFromLocation(pathname, search = "") {
  const params = new URLSearchParams(search);
  const queryToken =
    params.get("token") || params.get("code") || params.get("resetToken");

  if (queryToken) {
    return queryToken;
  }

  const segments = String(pathname || "")
    .split("/")
    .filter(Boolean);

  if (segments[0] === "reset-password" && segments[1]) {
    return decodeURIComponent(segments.slice(1).join("/"));
  }

  return "";
}
