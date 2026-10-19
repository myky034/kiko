import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  PERMISSIONS,
  permissionsForRoles,
  requirePermission,
} from "@/server/policy/permissions";

const LEARNING_PERMISSIONS = PERMISSIONS.filter((permission) =>
  /^(lesson|vocabulary|recording|writing|review|progress|transfer)\./.test(permission),
);

describe("permission registry", () => {
  it("gives OWNER no learner or private-data permission (no Owner bypass)", () => {
    const owner = permissionsForRoles(["OWNER"]);
    for (const permission of LEARNING_PERMISSIONS) {
      expect(owner.has(permission), permission).toBe(false);
    }
    expect(owner.has("integration.use_personal")).toBe(false);
  });

  it("gives LEARNER no administration permission", () => {
    const learner = permissionsForRoles(["LEARNER"]);
    for (const permission of PERMISSIONS.filter((p) => /^(access|system|audit|operations)\.|catalog\.(write|publish|retire|read_draft)|quota\.configure|integration\.configure_system/.test(p))) {
      expect(learner.has(permission), permission).toBe(false);
    }
  });

  it("combines both roles for the initial personal account", () => {
    const both = permissionsForRoles(["OWNER", "LEARNER"]);
    expect(both.has("lesson.read_private")).toBe(true);
    expect(both.has("access.manage_accounts")).toBe(true);
  });

  it("ignores unknown or differently cased role values (fail closed)", () => {
    expect(permissionsForRoles(["ADMIN", "owner", "*", ""]).size).toBe(0);
  });

  it("only grants permissions that exist in the registry", () => {
    const all = permissionsForRoles(["OWNER", "LEARNER"]);
    for (const permission of all) expect(PERMISSIONS).toContain(permission);
  });

  it("requirePermission throws for a missing permission", () => {
    const actor = { permissions: permissionsForRoles(["OWNER"]) };
    expect(() => requirePermission(actor, "recording.read_private")).toThrow(AuthorizationError);
    expect(() => requirePermission(actor, "access.read_accounts")).not.toThrow();
  });
});
