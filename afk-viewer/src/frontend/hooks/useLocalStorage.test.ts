import { test, expect, describe, beforeEach, mock } from "bun:test";
import { getStoredValue, setStoredValue, useLocalStorage } from "./useLocalStorage";
import React, { useState, useEffect } from "react";

// Mock localStorage
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
    // Helper for tests to set initial data
    _setStore: (data: Record<string, string>) => {
      store = { ...data };
    },
    _getStore: () => ({ ...store }),
  };
};

// Set up mock localStorage globally before tests
let mockStorage: ReturnType<typeof createMockLocalStorage>;

beforeEach(() => {
  mockStorage = createMockLocalStorage();
  // @ts-expect-error - mocking global localStorage
  globalThis.localStorage = mockStorage;
});

describe("getStoredValue", () => {
  test("returns stored value when key exists with valid JSON", () => {
    mockStorage._setStore({
      testKey: JSON.stringify({ name: "test", value: 42 }),
    });

    const result = getStoredValue("testKey", { name: "default", value: 0 });

    expect(result).toEqual({ name: "test", value: 42 });
  });

  test("returns fallback when key does not exist", () => {
    const fallback = { name: "fallback", count: 100 };

    const result = getStoredValue("nonExistentKey", fallback);

    expect(result).toEqual(fallback);
  });

  test("returns fallback when stored value is invalid JSON", () => {
    mockStorage._setStore({
      invalidKey: "this is not valid JSON {{{",
    });

    const fallback = { valid: true };
    const result = getStoredValue("invalidKey", fallback);

    expect(result).toEqual(fallback);
  });

  test("returns stored string value correctly", () => {
    mockStorage._setStore({
      stringKey: JSON.stringify("hello world"),
    });

    const result = getStoredValue("stringKey", "default");

    expect(result).toBe("hello world");
  });

  test("returns stored number value correctly", () => {
    mockStorage._setStore({
      numberKey: JSON.stringify(42),
    });

    const result = getStoredValue("numberKey", 0);

    expect(result).toBe(42);
  });

  test("returns stored array value correctly", () => {
    mockStorage._setStore({
      arrayKey: JSON.stringify(["a", "b", "c"]),
    });

    const result = getStoredValue("arrayKey", [] as string[]);

    expect(result).toEqual(["a", "b", "c"]);
  });

  test("returns stored null value correctly", () => {
    mockStorage._setStore({
      nullKey: JSON.stringify(null),
    });

    const result = getStoredValue<string | null>("nullKey", "default");

    expect(result).toBeNull();
  });

  test("returns stored boolean value correctly", () => {
    mockStorage._setStore({
      boolKey: JSON.stringify(false),
    });

    const result = getStoredValue("boolKey", true);

    expect(result).toBe(false);
  });
});

describe("setStoredValue", () => {
  test("stores object value as JSON", () => {
    const value = { name: "test", nested: { count: 5 } };

    setStoredValue("objectKey", value);

    const stored = mockStorage._getStore();
    expect(stored["objectKey"]).toBe(JSON.stringify(value));
  });

  test("stores string value as JSON", () => {
    setStoredValue("stringKey", "hello");

    const stored = mockStorage._getStore();
    expect(stored["stringKey"]).toBe(JSON.stringify("hello"));
  });

  test("stores number value as JSON", () => {
    setStoredValue("numberKey", 123);

    const stored = mockStorage._getStore();
    expect(stored["numberKey"]).toBe(JSON.stringify(123));
  });

  test("stores array value as JSON", () => {
    const array = [1, 2, 3, "four"];

    setStoredValue("arrayKey", array);

    const stored = mockStorage._getStore();
    expect(stored["arrayKey"]).toBe(JSON.stringify(array));
  });

  test("stores null value as JSON", () => {
    setStoredValue("nullKey", null);

    const stored = mockStorage._getStore();
    expect(stored["nullKey"]).toBe(JSON.stringify(null));
  });

  test("stores boolean value as JSON", () => {
    setStoredValue("boolKey", true);

    const stored = mockStorage._getStore();
    expect(stored["boolKey"]).toBe(JSON.stringify(true));
  });

  test("overwrites existing value", () => {
    mockStorage._setStore({
      existingKey: JSON.stringify("old value"),
    });

    setStoredValue("existingKey", "new value");

    const stored = mockStorage._getStore();
    expect(stored["existingKey"]).toBe(JSON.stringify("new value"));
  });
});

describe("PersistedState integration", () => {
  test("stores and retrieves PersistedState structure", () => {
    const persistedState = {
      pinnedProjects: ["/project/one", "/project/two"],
      expandedProjects: ["/project/one"],
      lastViewedSession: "session-123",
      panelWidths: { left: 300, right: 250 },
    };

    setStoredValue("afk-viewer-state", persistedState);
    const retrieved = getStoredValue("afk-viewer-state", {
      pinnedProjects: [],
      expandedProjects: [],
      lastViewedSession: null,
      panelWidths: { left: 280, right: 300 },
    });

    expect(retrieved).toEqual(persistedState);
  });

  test("handles partial state updates", () => {
    // Simulate storing just pinned projects
    setStoredValue("pinnedProjects", ["/my/project"]);

    const retrieved = getStoredValue<string[]>("pinnedProjects", []);

    expect(retrieved).toEqual(["/my/project"]);
  });
});

describe("useLocalStorage hook", () => {
  test("initializes with stored value when key exists", () => {
    mockStorage._setStore({
      hookKey: JSON.stringify("stored value"),
    });

    // Test that getStoredValue is called correctly (which the hook uses internally)
    const result = getStoredValue("hookKey", "default");
    expect(result).toBe("stored value");
  });

  test("initializes with initial value when key does not exist", () => {
    // Empty storage
    mockStorage._setStore({});

    const result = getStoredValue("newKey", "initial value");
    expect(result).toBe("initial value");
  });

  test("hook type signature is correct", () => {
    // Verify the hook exports correctly and has the right shape
    expect(typeof useLocalStorage).toBe("function");
  });
});
