import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/services/notificationService", () => ({
  notificationService: {
    fetchNotifications: vi.fn(),
    markAsRead: vi.fn(),
    subscribeToStream: vi.fn(),
  },
}));

import { notificationService, type Notification } from "@/services/notificationService";
import { NotificationBell } from "../NotificationBell";
import { useNotificationStore } from "@/store/useNotificationStore";
import { autoResetStore } from "@/test/helpers/resetStores";

const fetchMock = vi.mocked(notificationService.fetchNotifications);
const markAsReadMock = vi.mocked(notificationService.markAsRead);

autoResetStore(useNotificationStore);

const notif = (over: Partial<Notification> = {}): Notification => ({
  id: "n1",
  user_id: "u1",
  title: "New message",
  message: "You have a new update",
  is_read: false,
  created_at: new Date().toISOString(),
  type: "message",
  ...over,
});

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue([]);
  markAsReadMock.mockReset().mockResolvedValue(undefined);
});

describe("NotificationBell", () => {
  it("fetches the user's notifications on mount and shows the unread count on the badge", async () => {
    fetchMock.mockResolvedValue([notif({ id: "a" }), notif({ id: "b" }), notif({ id: "c", is_read: true })]);
    render(<NotificationBell userId="u1" />);
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("u1");
  });

  it("opens the dropdown and lists notifications on bell click", async () => {
    fetchMock.mockResolvedValue([notif()]);
    render(<NotificationBell userId="u1" />);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    expect(screen.getByText("New message")).toBeInTheDocument();
    expect(screen.getByText("You have a new update")).toBeInTheDocument();
  });

  it("marks a notification read, updates the badge, and calls the service", async () => {
    fetchMock.mockResolvedValue([notif()]);
    render(<NotificationBell userId="u1" />);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    fireEvent.click(screen.getByRole("button", { name: /mark read/i }));

    await waitFor(() => expect(markAsReadMock).toHaveBeenCalledWith("n1"));
    expect(screen.queryByRole("button", { name: /mark read/i })).not.toBeInTheDocument();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
