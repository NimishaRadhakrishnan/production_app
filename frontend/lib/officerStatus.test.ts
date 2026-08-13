import { describe, it, expect } from "vitest";
import { computeLiveOfficers, countActive, formatLastSeen, RawUser, RawActiveLocation } from "./officerStatus";

const NOW = new Date("2026-07-29T12:00:00Z").getTime();

const users: RawUser[] = [
  { id: "u1", full_name: "Dinesh Prabhu", role: "field_officer" },
  { id: "u2", full_name: "Karthik Raja", role: "sales_officer" },
  { id: "u3", full_name: "Suresh Kumar", role: "field_officer" },
  { id: "u4", full_name: "Nimisha R", role: "admin" }, // must be excluded
];

const locations: RawActiveLocation[] = [
  {
    officer_id: "u1",
    latitude: 11.66,
    longitude: 78.14,
    speed: 12,
    battery_level: 80,
    status: "active",
    updated_at: new Date(NOW - 2 * 60000).toISOString(), // 2 min ago
  },
  {
    officer_id: "u2",
    latitude: 11.2,
    longitude: 78.16,
    speed: 0,
    battery_level: 40,
    status: "stale",
    updated_at: new Date(NOW - 20 * 60000).toISOString(), // 20 min ago
  },
  // u3 has no row at all => never reported
];

describe("computeLiveOfficers", () => {
  it("excludes non field/sales roles", () => {
    const officers = computeLiveOfficers(users, locations, NOW);
    expect(officers.find((o) => o.id === "u4")).toBeUndefined();
    expect(officers.length).toBe(3);
  });

  it("marks an officer with no ping row as Never reported, not a fake recent time", () => {
    const officers = computeLiveOfficers(users, locations, NOW);
    const u3 = officers.find((o) => o.id === "u3")!;
    expect(u3.everReported).toBe(false);
    expect(u3.lastVisit).toBe("Never reported");
    expect(u3.status).toBe("Location unavailable");
  });

  it("formats a real recent ping as 'Last seen N min ago'", () => {
    const officers = computeLiveOfficers(users, locations, NOW);
    const u1 = officers.find((o) => o.id === "u1")!;
    expect(u1.everReported).toBe(true);
    expect(u1.lastVisit).toBe("Last seen 2 min ago");
    expect(u1.status).toBe("Active");
  });

  it("active count always equals number of rows whose status is exactly 'Active'", () => {
    const officers = computeLiveOfficers(users, locations, NOW);
    const manualCount = officers.filter((o) => o.status === "Active").length;
    expect(countActive(officers)).toBe(manualCount);
    expect(countActive(officers)).toBe(1); // only u1 is active; u2 is stale, u3 never reported
  });
});

describe("formatLastSeen", () => {
  it("returns 'Never reported' for null/undefined timestamps", () => {
    expect(formatLastSeen(null, NOW)).toBe("Never reported");
    expect(formatLastSeen(undefined, NOW)).toBe("Never reported");
  });

  it("never fabricates a recent time for missing data", () => {
    // Guards against the historical bug where the backend defaulted
    // updated_at to "now" for officers who had never actually pinged.
    expect(formatLastSeen(null, NOW)).not.toMatch(/just now/);
  });
});
