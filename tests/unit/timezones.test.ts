import { describe, expect, it } from "vitest";
import { isSupportedTimeZone, listSupportedTimeZones } from "@/modules/language/timezones";

describe("timezones", () => {
  it.each(["Asia/Ho_Chi_Minh", "Asia/Tokyo", "Asia/Shanghai", "UTC", "America/Argentina/Buenos_Aires", "Etc/GMT+7"])(
    "accepts IANA name %s",
    (zone) => {
      expect(isSupportedTimeZone(zone)).toBe(true);
    },
  );

  it.each(["+07:00", "GMT+7", "asia/ho_chi_minh", "Mars/Olympus", "", " Asia/Tokyo", "Asia/" + "X".repeat(70)])(
    "rejects %j",
    (zone) => {
      expect(isSupportedTimeZone(zone)).toBe(false);
    },
  );

  it("always lists UTC and requested defaults, sorted and unique", () => {
    const zones = listSupportedTimeZones(["Asia/Ho_Chi_Minh", "Asia/Ho_Chi_Minh", "bogus"]);
    expect(zones).toContain("UTC");
    expect(zones).toContain("Asia/Ho_Chi_Minh");
    expect(zones).not.toContain("bogus");
    expect(new Set(zones).size).toBe(zones.length);
    expect([...zones].sort()).toEqual(zones);
  });
});
