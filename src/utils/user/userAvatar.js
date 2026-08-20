export function getUserAvatar(user) {
  const profilePicture = String(user?.profilePicture || user?.avatarUrl || '').trim();

  if (profilePicture) {
    try {
      const url = new URL(profilePicture);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.toString();
      }
    } catch {
      // Invalid URL string
    }
  }

  const email = String(user?.email || '').trim().toLowerCase();
  if (email) {
    return `https://unavatar.io/${encodeURIComponent(email)}`;
  }

  return null;
}

export function getGoogleProfilePicture(user) {
  return getUserAvatar(user);
}

