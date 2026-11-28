import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./app.js";

describe("API foundation", () => {
  it("exposes a versioned health endpoint", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe("agrinexus-api");
    expect(response.body.data.status).toBe("ok");
  });
  it("returns a consistent not-found envelope", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
  it("rejects registration payloads that do not meet the contract", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({ email: "not-an-email", password: "short" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
  it("protects the current-user endpoint", async () => {
    const response = await request(app).get("/api/v1/auth/me");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
  it("requires authentication before organization access", async () => {
    const response = await request(app).get("/api/v1/organizations");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
  it("protects the farm registry behind authentication", async () => {
    const response = await request(app).get("/api/v1/farms");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
  it("protects the plot registry behind authentication", async () => {
    const response = await request(app).get("/api/v1/plots/507f1f77bcf86cd799439011");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});
