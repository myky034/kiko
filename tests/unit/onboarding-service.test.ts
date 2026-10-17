import { beforeEach, describe, expect, it } from "vitest";
import { resolveAccess } from "@/modules/identity/access";
import { loadDashboard } from "@/modules/identity/dashboard";
import { saveOnboarding } from "@/modules/identity/onboarding";
import {
  FakeIdentityProvider,
  InMemoryIdentityStore,
  identity,
} from "../support/in-memory-identity";

let store: InMemoryIdentityStore;
let providerA: FakeIdentityProvider;
let providerB: FakeIdentityProvider;
let userA: string;
let userB: string;

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

const validForm = () =>
  form([
    ["languages", "zh"],
    ["languages", "ja"],
    ["timezone", "Asia/Ho_Chi_Minh"],
  ]);

async function activeUserId(provider: FakeIdentityProvider): Promise<string> {
  const result = await resolveAccess({ provider, repository: store });
  if (result.status !== "active") throw new Error("expected active actor");
  return result.actor.userId;
}

beforeEach(async () => {
  store = new InMemoryIdentityStore();
  store.allowEmail("a@example.test", ["OWNER", "LEARNER"]);
  store.allowEmail("b@example.test", ["LEARNER"]);
  providerA = new FakeIdentityProvider(identity("s-a", "a@example.test"));
  providerB = new FakeIdentityProvider(identity("s-b", "b@example.test"));
  userA = await activeUserId(providerA);
  userB = await activeUserId(providerB);
});

describe("saveOnboarding", () => {
  it("saves the actor's own languages and timezone", async () => {
    const outcome = await saveOnboarding({ provider: providerA, repository: store }, validForm());
    expect(outcome).toEqual({ status: "saved" });
    expect(store.profiles.get(userA)?.timezone).toBe("Asia/Ho_Chi_Minh");
    expect(store.profiles.get(userA)?.onboardedAt).toBeInstanceOf(Date);
    expect(Object.fromEntries(store.preferences.get(userA)!)).toEqual({ zh: true, ja: true });
  });

  it("rejects unauthenticated requests without writing", async () => {
    const outcome = await saveOnboarding(
      { provider: new FakeIdentityProvider(null), repository: store },
      validForm(),
    );
    expect(outcome).toEqual({ status: "unauthenticated" });
    expect(store.preferences.size).toBe(0);
  });

  it("rejects an identity that was never admitted without writing", async () => {
    const outcome = await saveOnboarding(
      { provider: new FakeIdentityProvider(identity("s-e", "e@example.test")), repository: store },
      validForm(),
    );
    expect(outcome).toEqual({ status: "denied" });
    expect(store.preferences.size).toBe(0);
  });

  it("rejects a suspended account", async () => {
    store.setState(userB, "suspended");
    const outcome = await saveOnboarding({ provider: providerB, repository: store }, validForm());
    expect(outcome).toEqual({ status: "denied" });
    expect(store.preferences.has(userB)).toBe(false);
  });

  it("rejects a write when the account is suspended mid-request", async () => {
    // Access resolves while active; suspension commits before the guarded write.
    store.beforeSave = () => store.setState(userB, "suspended");
    const outcome = await saveOnboarding({ provider: providerB, repository: store }, validForm());
    expect(outcome).toEqual({ status: "denied" });
    expect(store.profiles.get(userB)?.timezone).toBeNull();
    expect(store.preferences.has(userB)).toBe(false);
  });

  it("rejects a write when roles changed mid-request (stale revision)", async () => {
    store.beforeSave = () => {
      store.profiles.get(userB)!.authorizationRevision += 1;
    };
    const outcome = await saveOnboarding({ provider: providerB, repository: store }, validForm());
    expect(outcome).toEqual({ status: "denied" });
  });

  it("cannot target another user's profile through form fields", async () => {
    const outcome = await saveOnboarding(
      { provider: providerB, repository: store },
      form([
        ["languages", "en"],
        ["timezone", "UTC"],
        ["userId", userA],
      ]),
    );
    expect(outcome.status).toBe("invalid");
    expect(store.preferences.has(userA)).toBe(false);
    expect(store.profiles.get(userA)?.timezone).toBeNull();
  });

  it("only ever writes the session actor's profile", async () => {
    await saveOnboarding({ provider: providerB, repository: store }, validForm());
    expect(store.preferences.has(userB)).toBe(true);
    expect(store.preferences.has(userA)).toBe(false);
    expect(store.profiles.get(userA)?.onboardedAt).toBeNull();
  });

  it("rejects self-escalation fields and records a denied audit event", async () => {
    const outcome = await saveOnboarding(
      { provider: providerB, repository: store },
      form([
        ["languages", "en"],
        ["timezone", "UTC"],
        ["role", "OWNER"],
        ["state", "active"],
      ]),
    );
    expect(outcome.status).toBe("invalid");
    expect(await store.listRoleCodes(userB)).toEqual(["LEARNER"]);
    expect(store.profiles.get(userB)?.onboardedAt).toBeNull();
    expect(store.audit).toContainEqual(
      expect.objectContaining({ actorUserId: userB, action: "profile.onboarding", result: "denied" }),
    );
  });

  it("converges on repeated submissions without duplicates or a new onboarding time", async () => {
    await saveOnboarding({ provider: providerA, repository: store }, validForm());
    const firstOnboardedAt = store.profiles.get(userA)!.onboardedAt;

    const again = await saveOnboarding({ provider: providerA, repository: store }, validForm());
    expect(again).toEqual({ status: "saved" });
    expect(store.profiles.get(userA)!.onboardedAt).toBe(firstOnboardedAt);
    expect(store.preferences.get(userA)!.size).toBe(2);
  });

  it("disables languages that are no longer selected", async () => {
    await saveOnboarding({ provider: providerA, repository: store }, validForm());
    await saveOnboarding(
      { provider: providerA, repository: store },
      form([
        ["languages", "en"],
        ["timezone", "Asia/Tokyo"],
      ]),
    );
    expect(Object.fromEntries(store.preferences.get(userA)!)).toEqual({
      zh: false,
      ja: false,
      en: true,
    });
  });
});

describe("loadDashboard", () => {
  it("shows only the actor's own enabled languages", async () => {
    await saveOnboarding({ provider: providerA, repository: store }, validForm());
    const access = await resolveAccess({ provider: providerB, repository: store });
    if (access.status !== "active") throw new Error("expected active");
    const data = await loadDashboard(access.actor, store);
    expect(data.languages).toEqual([]);
    expect(data.isOwner).toBe(false);
  });

  it("does not query learner data for an Owner-only account", async () => {
    store.allowEmail("c@example.test", ["OWNER"]);
    const access = await resolveAccess({
      provider: new FakeIdentityProvider(identity("s-c", "c@example.test")),
      repository: store,
    });
    if (access.status !== "active") throw new Error("expected active");
    let preferenceQueries = 0;
    const repository = Object.create(store, {
      listLanguagePreferences: {
        value: async () => {
          preferenceQueries += 1;
          return [];
        },
      },
    });
    const data = await loadDashboard(access.actor, repository);
    expect(preferenceQueries).toBe(0);
    expect(data).toMatchObject({ isLearner: false, isOwner: true, languages: [] });
  });
});
