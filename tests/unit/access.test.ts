import { beforeEach, describe, expect, it } from "vitest";
import { resolveAccess } from "@/modules/identity/access";
import {
  FakeIdentityProvider,
  InMemoryIdentityStore,
  identity,
} from "../support/in-memory-identity";

let store: InMemoryIdentityStore;

beforeEach(() => {
  store = new InMemoryIdentityStore();
});

function access(provider: FakeIdentityProvider) {
  return resolveAccess({ provider, repository: store });
}

describe("resolveAccess", () => {
  it("treats a missing session as unauthenticated", async () => {
    expect(await access(new FakeIdentityProvider(null))).toEqual({ status: "unauthenticated" });
  });

  it("denies anonymous provider identities", async () => {
    store.allowEmail("a@example.test", ["LEARNER"]);
    const result = await access(new FakeIdentityProvider(identity("s-anon", "a@example.test", true)));
    expect(result).toEqual({ status: "denied", reason: "anonymous_identity" });
  });

  it("denies a provider identity whose email was never approved", async () => {
    const result = await access(new FakeIdentityProvider(identity("s-e", "e@example.test")));
    expect(result).toEqual({ status: "denied", reason: "not_admitted" });
    expect(store.profiles.size).toBe(0);
  });

  it("does not admit an approved email the provider has not confirmed", async () => {
    store.allowEmail("a@example.test", ["OWNER", "LEARNER"]);
    const result = await access(new FakeIdentityProvider(identity("s-a", "a@example.test"), false));
    expect(result).toEqual({ status: "denied", reason: "email_unverified" });
    expect(store.profiles.size).toBe(0);
  });

  it("admits a pre-approved email on first sign-in with exactly its granted roles", async () => {
    store.allowEmail("a@example.test", ["OWNER", "LEARNER"]);
    const result = await access(new FakeIdentityProvider(identity("s-a", "a@example.test")));
    expect(result.status).toBe("active");
    if (result.status !== "active") return;
    expect([...result.actor.roles].sort()).toEqual(["LEARNER", "OWNER"]);
    expect(result.actor.permissions.has("lesson.read_private")).toBe(true);
    expect(result.actor.onboardedAt).toBeNull();
  });

  it("never makes the first visitor an Owner", async () => {
    // No admission records at all: the very first sign-in gets nothing.
    const result = await access(new FakeIdentityProvider(identity("s-first", "first@example.test")));
    expect(result.status).toBe("denied");
    expect([...store.roles.values()].flat()).not.toContain("OWNER");
  });

  it("returns the same account on repeated sign-ins", async () => {
    store.allowEmail("b@example.test", ["LEARNER"]);
    const provider = new FakeIdentityProvider(identity("s-b", "b@example.test"));
    const first = await access(provider);
    const second = await access(provider);
    expect(first.status === "active" && second.status === "active").toBe(true);
    if (first.status === "active" && second.status === "active") {
      expect(second.actor.userId).toBe(first.actor.userId);
    }
    expect(store.profiles.size).toBe(1);
  });

  it("does not let a second provider identity claim an already bound email", async () => {
    store.allowEmail("b@example.test", ["LEARNER"]);
    await access(new FakeIdentityProvider(identity("s-b", "b@example.test")));
    const result = await access(new FakeIdentityProvider(identity("s-other", "b@example.test")));
    expect(result).toEqual({ status: "denied", reason: "not_admitted" });
  });

  it("does not admit a revoked email", async () => {
    store.allowEmail("r@example.test", ["LEARNER"], "revoked");
    const result = await access(new FakeIdentityProvider(identity("s-r", "r@example.test")));
    expect(result).toEqual({ status: "denied", reason: "not_admitted" });
  });

  it.each(["suspended", "removed", "pending"] as const)("denies a %s account", async (state) => {
    store.allowEmail("d@example.test", ["LEARNER"]);
    const provider = new FakeIdentityProvider(identity("s-d", "d@example.test"));
    const first = await access(provider);
    if (first.status !== "active") throw new Error("setup failed");
    store.setState(first.actor.userId, state);
    expect(await access(provider)).toEqual({ status: "denied", reason: state });
  });

  it("gives an Owner-only account no learner permissions", async () => {
    store.allowEmail("c@example.test", ["OWNER"]);
    const result = await access(new FakeIdentityProvider(identity("s-c", "c@example.test")));
    if (result.status !== "active") throw new Error("expected active");
    expect(result.actor.permissions.has("progress.read_private")).toBe(false);
    expect(result.actor.permissions.has("access.read_accounts")).toBe(true);
  });

  it("drops unknown role values stored for an account", async () => {
    store.allowEmail("x@example.test", ["LEARNER", "SUPERADMIN"]);
    const result = await access(new FakeIdentityProvider(identity("s-x", "x@example.test")));
    if (result.status !== "active") throw new Error("expected active");
    expect(result.actor.roles).toEqual(["LEARNER"]);
  });
});
