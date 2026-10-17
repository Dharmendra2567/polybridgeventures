import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { App } from "../src/App.js";

describe("App Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/auth/login")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            user: {
              id: "usr-1",
              name: "Rahul Patel",
              email: "partner@polybridgeventures.com",
              department: "Executive Management",
              subdepartment: "Managing Desk",
              designation: "Managing Partner",
              role: "ADMINISTRATOR",
              dataScope: "GLOBAL",
              approvalLimit: 500000,
            },
          }),
          headers: new Headers(),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          authenticated: false,
          status: "ok",
          version: "0.1.0",
        }),
        headers: new Headers(),
      } as Response;
    });
  });

  it("Prompts for login when unauthenticated with branded credentials", () => {
    render(<App />);
    expect(screen.getByText("Polybridge Ventures LLP")).toBeInTheDocument();
    expect(screen.getByText("Sign In to Trade Desk")).toBeInTheDocument();
    expect(screen.getByText("One-Click Role Authentication:")).toBeInTheDocument();
  });

  it("Authenticates and opens Trading Operations Portal upon login", async () => {
    render(<App />);
    const loginButton = screen.getByText("Rahul Patel");
    fireEvent.click(loginButton);

    expect(await screen.findByText("Trading Operations Portal")).toBeInTheDocument();
    expect(screen.getByText("Polybridge Ventures")).toBeInTheDocument();
    expect(screen.getByText("Executive Dashboard")).toBeInTheDocument();
  });
});
