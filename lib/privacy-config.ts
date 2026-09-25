/** Public facts supplied by the operator; never put credentials in these settings. */
export const privacyContact = {
  controller: "Bjartur Blær Gunnlaugsson",
  email: "bjarturbbg@gmail.com"
};

export const privacyNoticeVersion = "2026-09-24";

export const privacyDeploymentFields = {
  dataLocation: "PRIVACY_DATA_LOCATION",
  transferSafeguards: "PRIVACY_TRANSFER_SAFEGUARDS",
  backupRetention: "PRIVACY_BACKUP_RETENTION",
  logRetention: "PRIVACY_LOG_RETENTION",
  supportRetention: "PRIVACY_SUPPORT_RETENTION"
} as const;

export function getPrivacyDeployment(env: Record<string, string | undefined> = process.env) {
  const details = Object.fromEntries(Object.entries(privacyDeploymentFields).map(([key, name]) => [key, env[name]?.trim() || null])) as Record<keyof typeof privacyDeploymentFields, string | null>;
  const missing = Object.entries(privacyDeploymentFields).filter(([key]) => !details[key as keyof typeof details]).map(([, name]) => name);
  return {
    ...details,
    missing,
    // This is an application release guard, not proof of legal compliance.
    // The operator must separately verify provider settings and the launch checklist.
    registrationOpen: env.PUBLIC_REGISTRATION_ENABLED === "true" && missing.length === 0
  };
}
