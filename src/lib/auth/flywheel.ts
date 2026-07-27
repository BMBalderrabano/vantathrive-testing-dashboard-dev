const FLYWHEEL_EMAIL_SUFFIX = "@flywheel.so";

export function isFlywheelOperatorEmail(
  email: string | null | undefined,
): boolean {
  if (!email) {
    return false;
  }
  return email.toLowerCase().trim().endsWith(FLYWHEEL_EMAIL_SUFFIX);
}

export const FLYWHEEL_ACCESS_DENIED_MESSAGE =
  "Access denied. Only @flywheel.so operator accounts may sign in.";
