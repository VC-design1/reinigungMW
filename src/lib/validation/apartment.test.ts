import { describe, expect, it } from "vitest";
import { apartmentSchema, bookingSchema, inventoryItemSchema } from "./apartment";

describe("apartmentSchema", () => {
  it("accepts a minimal valid apartment", () => {
    const result = apartmentSchema.safeParse({
      name: "Wohnung 1",
      address: "Hauptstraße 1",
      room_count: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.room_count).toBe(3);
      expect(result.data.occupancy_status).toBe("free");
    }
  });

  it("rejects a room count below 1", () => {
    const result = apartmentSchema.safeParse({ name: "A", address: "B", room_count: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing name", () => {
    const result = apartmentSchema.safeParse({ name: "", address: "B", room_count: "1" });
    expect(result.success).toBe(false);
  });
});

describe("inventoryItemSchema", () => {
  it("requires a name", () => {
    expect(inventoryItemSchema.safeParse({ name: "" }).success).toBe(false);
    expect(inventoryItemSchema.safeParse({ name: "Fernbedienung" }).success).toBe(true);
  });
});

describe("bookingSchema", () => {
  it("accepts a valid booking range", () => {
    const result = bookingSchema.safeParse({
      start_date: "2026-08-01",
      end_date: "2026-08-05",
      summary: "Familie Muster",
    });
    expect(result.success).toBe(true);
  });

  it("rejects departure on or before arrival", () => {
    expect(
      bookingSchema.safeParse({ start_date: "2026-08-05", end_date: "2026-08-05" }).success
    ).toBe(false);
    expect(
      bookingSchema.safeParse({ start_date: "2026-08-05", end_date: "2026-08-01" }).success
    ).toBe(false);
  });

  it("rejects malformed dates", () => {
    expect(bookingSchema.safeParse({ start_date: "01.08.2026", end_date: "2026-08-05" }).success).toBe(
      false
    );
    expect(bookingSchema.safeParse({ start_date: "", end_date: "" }).success).toBe(false);
  });

  it("allows an empty summary", () => {
    expect(bookingSchema.safeParse({ start_date: "2026-08-01", end_date: "2026-08-02" }).success).toBe(
      true
    );
  });
});
