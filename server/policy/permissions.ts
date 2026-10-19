/**
 * Permission registry and role mapping (ACCESS_CONTROL.md §6).
 *
 * Permission IDs are stable contracts; scope/ownership is checked separately by
 * each use case. There is no wildcard and no OWNER bypass: OWNER does not
 * inherit learner permissions or access to another learner's private data.
 */

export const ROLE_CODES = ["OWNER", "LEARNER"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const PERMISSIONS = [
  "profile.read_self",
  "profile.update_self",
  "lesson.read_private",
  "lesson.write_private",
  "lesson.delete_private",
  "vocabulary.read_private",
  "vocabulary.write_private",
  "vocabulary.delete_private",
  "recording.read_private",
  "recording.create_private",
  "recording.delete_private",
  "writing.read_private",
  "writing.create_private",
  "writing.delete_private",
  "review.read_private",
  "review.manage_private",
  "review.submit",
  "progress.read_private",
  "catalog.read_published",
  "catalog.read_draft",
  "catalog.write",
  "catalog.publish",
  "catalog.retire",
  "transfer.export_self",
  "transfer.restore_self",
  "integration.use_personal",
  "integration.configure_system",
  "quota.read_self",
  "quota.configure",
  "access.read_accounts",
  "access.manage_accounts",
  "access.assign_roles",
  "system.configure",
  "operations.read_metadata",
  "audit.read_admin",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Readonly<Record<RoleCode, readonly Permission[]>> = {
  LEARNER: [
    "profile.read_self",
    "profile.update_self",
    "lesson.read_private",
    "lesson.write_private",
    "lesson.delete_private",
    "vocabulary.read_private",
    "vocabulary.write_private",
    "vocabulary.delete_private",
    "recording.read_private",
    "recording.create_private",
    "recording.delete_private",
    "writing.read_private",
    "writing.create_private",
    "writing.delete_private",
    "review.read_private",
    "review.manage_private",
    "review.submit",
    "progress.read_private",
    "catalog.read_published",
    "transfer.export_self",
    "transfer.restore_self",
    "integration.use_personal",
    "quota.read_self",
  ],
  OWNER: [
    "profile.read_self",
    "profile.update_self",
    "catalog.read_published",
    "catalog.read_draft",
    "catalog.write",
    "catalog.publish",
    "catalog.retire",
    "integration.configure_system",
    "quota.read_self",
    "quota.configure",
    "access.read_accounts",
    "access.manage_accounts",
    "access.assign_roles",
    "system.configure",
    "operations.read_metadata",
    "audit.read_admin",
  ],
};

export function isRoleCode(value: unknown): value is RoleCode {
  return typeof value === "string" && (ROLE_CODES as readonly string[]).includes(value);
}

/** Unknown role values from storage are ignored (fail closed), never mapped. */
export function permissionsForRoles(roles: readonly string[]): ReadonlySet<Permission> {
  const granted = new Set<Permission>();
  for (const role of roles) {
    if (!isRoleCode(role)) continue;
    for (const permission of ROLE_PERMISSIONS[role]) granted.add(permission);
  }
  return granted;
}

export class AuthorizationError extends Error {
  constructor(readonly permission: Permission) {
    super("forbidden");
    this.name = "AuthorizationError";
  }
}

export function hasPermission(
  actor: { permissions: ReadonlySet<Permission> },
  permission: Permission,
): boolean {
  return actor.permissions.has(permission);
}

export function requirePermission(
  actor: { permissions: ReadonlySet<Permission> },
  permission: Permission,
): void {
  if (!actor.permissions.has(permission)) throw new AuthorizationError(permission);
}
