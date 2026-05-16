export const LOCAL_TOKEN_KEY = "dws.auth.token";
export const SESSION_TOKEN_KEY = "dws.auth.session.token";
export const LOCAL_TOKEN_TIME_KEY = "dws.auth.token.issuedAt";
export const SESSION_TOKEN_TIME_KEY = "dws.auth.session.token.issuedAt";
export const LOCAL_PROFILE_KEY = "dws.auth.profile";
export const SESSION_PROFILE_KEY = "dws.auth.session.profile";
export const PROFILE_UPDATED_EVENT = "dws:profile-updated";
export const SESSION_DURATION_MS = 60 * 60 * 1000;

export const DEFAULT_USER_PROFILE = {
  username: "User",
  email: "No email available",
  firstLetter: "U",
  profileImage: "",
};

function clearStorageGroup(storage, tokenKey, timeKey, profileKey) {
  storage.removeItem(tokenKey);
  storage.removeItem(timeKey);
  storage.removeItem(profileKey);
}

function parseStoredProfile(rawProfile) {
  if (!rawProfile) {
    return null;
  }

  try {
    const parsedProfile = JSON.parse(rawProfile);

    if (parsedProfile && typeof parsedProfile === "object") {
      return parsedProfile;
    }
  } catch {
    return null;
  }

  return null;
}

function readStoredSession(storage, tokenKey, timeKey, profileKey) {
  const token = storage.getItem(tokenKey);

  if (!token) {
    return null;
  }

  const issuedAtRaw = storage.getItem(timeKey);
  const profile = parseStoredProfile(storage.getItem(profileKey));

  if (!issuedAtRaw) {
    return { token, issuedAt: null, profile };
  }

  const issuedAt = Number(issuedAtRaw);

  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt >= SESSION_DURATION_MS) {
    clearStorageGroup(storage, tokenKey, timeKey, profileKey);
    return null;
  }

  return { token, issuedAt, profile };
}

export function clearStoredAuth() {
  clearStorageGroup(
    window.localStorage,
    LOCAL_TOKEN_KEY,
    LOCAL_TOKEN_TIME_KEY,
    LOCAL_PROFILE_KEY,
  );
  clearStorageGroup(
    window.sessionStorage,
    SESSION_TOKEN_KEY,
    SESSION_TOKEN_TIME_KEY,
    SESSION_PROFILE_KEY,
  );
}

export function readStoredAuthSession() {
  return (
    readStoredSession(
      window.localStorage,
      LOCAL_TOKEN_KEY,
      LOCAL_TOKEN_TIME_KEY,
      LOCAL_PROFILE_KEY,
    ) ||
    readStoredSession(
      window.sessionStorage,
      SESSION_TOKEN_KEY,
      SESSION_TOKEN_TIME_KEY,
      SESSION_PROFILE_KEY,
    )
  );
}

export function hasActiveAuthSession() {
  return Boolean(readStoredAuthSession()?.token);
}

export function persistAuthSession({ token, rememberMe, profile = null }) {
  clearStoredAuth();

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  const tokenKey = rememberMe ? LOCAL_TOKEN_KEY : SESSION_TOKEN_KEY;
  const timeKey = rememberMe ? LOCAL_TOKEN_TIME_KEY : SESSION_TOKEN_TIME_KEY;
  const profileKey = rememberMe ? LOCAL_PROFILE_KEY : SESSION_PROFILE_KEY;

  storage.setItem(tokenKey, token);
  storage.setItem(timeKey, String(Date.now()));

  if (profile) {
    storage.setItem(profileKey, JSON.stringify(profile));
  }
}

export function readStoredUserProfile() {
  const profileCandidates = [
    window.localStorage.getItem(LOCAL_PROFILE_KEY),
    window.sessionStorage.getItem(SESSION_PROFILE_KEY),
  ];

  for (const candidate of profileCandidates) {
    if (!candidate) {
      continue;
    }

    try {
      const parsedProfile = JSON.parse(candidate);

      if (parsedProfile && typeof parsedProfile === "object") {
        return parsedProfile;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function persistUserProfile(profile) {
  const payload = JSON.stringify(profile);

  if (window.localStorage.getItem(LOCAL_TOKEN_KEY)) {
    window.localStorage.setItem(LOCAL_PROFILE_KEY, payload);
  }

  if (window.sessionStorage.getItem(SESSION_TOKEN_KEY)) {
    window.sessionStorage.setItem(SESSION_PROFILE_KEY, payload);
  }
}

export function normalizeUserProfile(response, fallbackProfile = null) {
  const profile =
    response?.data?.user ||
    response?.data ||
    response?.user ||
    response ||
    {};
  const fallback = fallbackProfile || DEFAULT_USER_PROFILE;

  const username =
    profile.username ||
    profile.name ||
    profile.fullName ||
    fallback.username ||
    DEFAULT_USER_PROFILE.username;
  const email = profile.email || fallback.email || DEFAULT_USER_PROFILE.email;

  return {
    username,
    email,
    firstLetter:
      profile.firstLetter ||
      fallback.firstLetter ||
      username.trim().charAt(0).toUpperCase() ||
      DEFAULT_USER_PROFILE.firstLetter,
    profileImage:
      profile.profileImage ||
      profile.avatarUrl ||
      profile.photoUrl ||
      fallback.profileImage ||
      "",
  };
}

export function buildUserProfileFromAuthResponse(response, fallbackEmail = "") {
  const profile =
    response?.data?.user ||
    response?.data ||
    response?.user ||
    response ||
    {};
  const rememberedProfile = readStoredUserProfile() || {};
  const normalizedEmail = String(fallbackEmail).trim();
  const username =
    profile.username ||
    profile.name ||
    profile.fullName ||
    rememberedProfile.username ||
    rememberedProfile.name ||
    DEFAULT_USER_PROFILE.username;
  const email =
    profile.email ||
    rememberedProfile.email ||
    normalizedEmail ||
    DEFAULT_USER_PROFILE.email;

  return {
    username,
    email,
    firstLetter:
      profile.firstLetter ||
      rememberedProfile.firstLetter ||
      username.trim().charAt(0).toUpperCase() ||
      DEFAULT_USER_PROFILE.firstLetter,
    profileImage:
      profile.profileImage ||
      profile.avatarUrl ||
      profile.photoUrl ||
      rememberedProfile.profileImage ||
      rememberedProfile.avatarUrl ||
      rememberedProfile.photoUrl ||
      DEFAULT_USER_PROFILE.profileImage,
  };
}

export function broadcastProfileUpdate(profile) {
  persistUserProfile(profile);
  window.dispatchEvent(
    new CustomEvent(PROFILE_UPDATED_EVENT, {
      detail: profile,
    }),
  );
}
