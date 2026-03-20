import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@/hooks/use-auth";

// --- Mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth", () => {
  it("returns signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toHaveProperty("signIn");
    expect(result.current).toHaveProperty("signUp");
    expect(result.current.isLoading).toBe(false);
  });

  // --- signIn ---

  describe("signIn", () => {
    it("calls signInAction and returns the result", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      let response: unknown;

      await act(async () => {
        response = await result.current.signIn("test@example.com", "password");
      });

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "password");
      expect(response).toEqual({ success: false, error: "Invalid credentials" });
    });

    it("sets isLoading to true during sign in and resets after", async () => {
      let resolveSignIn: (v: unknown) => void;
      mockSignInAction.mockReturnValue(
        new Promise((r) => {
          resolveSignIn = r;
        })
      );

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<unknown>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "pw");
      });

      // isLoading should be true while awaiting
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn!({ success: false });
        await signInPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading even when signInAction throws", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signIn("a@b.com", "pw")).rejects.toThrow("Network error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not navigate when sign in fails", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "bad" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("saves anonymous work as a project and navigates on successful sign in with anon work", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: { "/": {} },
      });
      mockCreateProject.mockResolvedValue({ id: "proj-anon" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "hello" }],
          data: { "/": {} },
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-anon");
    });

    it("navigates to most recent project when no anon work exists", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "proj-1" }, { id: "proj-2" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-1");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it("creates a new project when no anon work and no existing projects", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj-new" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/proj-new");
    });

    it("treats anon work with empty messages as no anon work", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue([{ id: "proj-existing" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      // Should skip anon work path and go to existing projects
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-existing");
    });
  });

  // --- signUp ---

  describe("signUp", () => {
    it("calls signUpAction and returns the result", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email taken" });

      const { result } = renderHook(() => useAuth());
      let response: unknown;

      await act(async () => {
        response = await result.current.signUp("test@example.com", "password");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("test@example.com", "password");
      expect(response).toEqual({ success: false, error: "Email taken" });
    });

    it("sets isLoading during sign up and resets after", async () => {
      mockSignUpAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "pw");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading even when signUpAction throws", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signUp("a@b.com", "pw")).rejects.toThrow("Server error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not navigate when sign up fails", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "bad" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "pw");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("saves anonymous work and navigates on successful sign up", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "build a button" }],
        fileSystemData: { "/": {}, "/App.jsx": "code" },
      });
      mockCreateProject.mockResolvedValue({ id: "proj-signup" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@user.com", "pw");
      });

      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-signup");
    });

    it("creates a new project when sign up succeeds with no anon work and no projects", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj-fresh" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@user.com", "pw");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-fresh");
    });
  });

  // --- handlePostSignIn edge cases ---

  describe("post-sign-in routing edge cases", () => {
    it("handles getAnonWorkData returning null gracefully", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "p1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockPush).toHaveBeenCalledWith("/p1");
    });
  });
});
