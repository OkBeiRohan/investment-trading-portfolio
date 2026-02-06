export function getInitials(name: string | null | undefined): string {
  if (!name) {
    return "";
  }

  const trimmed = name.trim();
  if (trimmed === "") {
    return "";
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length === 1) {
    const firstPart = parts[0];
    return firstPart ? firstPart.slice(0, 2).toUpperCase() : "";
  }

  const firstPart = parts[0];
  const lastPart = parts[parts.length - 1];

  if (!firstPart || !lastPart) {
    return "";
  }

  const firstInitial = firstPart.charAt(0);
  const lastInitial = lastPart.charAt(0);

  return (firstInitial + lastInitial).toUpperCase();
}
