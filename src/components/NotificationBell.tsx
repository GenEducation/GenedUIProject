import React, { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, CheckCircle2, MessageSquare, Info, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { useNotificationStore } from "../store/useNotificationStore";
import type { Notification } from "@/services/notificationService";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MomentArt } from "@/components/shared/MomentArt";
import { EMPTY_NOTIFICATIONS_ART } from "@/features/student/theme/momentArt";

interface NotificationBellProps {
  userId: string;
  /** Kept for callers; the notifications now open as a centred dialog, so it no longer positions anything. */
  align?: "left" | "right";
}

/**
 * The bell and its notifications, in the moments' paper-and-ink style: a cream paper sheet, ink-green type, one
 * lime accent (the unread marks). Opens centred, as a dialog. With nothing to show it shows the paper plane parked
 * on its runway: nothing in flight.
 */
const INK = "#17500F";
const INK_SOFT = "rgba(23,80,15,0.62)";
const INK_FAINT = "rgba(23,80,15,0.42)";
const LIME = "#A6CF08";
const PAPER = "#FBFAF4";
const RULE = "rgba(23,80,15,0.09)";

const timeAgo = (date: string | Date) => {
  const past = new Date(date);
  // Guard against unparseable dates so we never render "NaN … ago".
  if (Number.isNaN(past.getTime())) return "just now";
  const seconds = Math.floor((Date.now() - past.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return days === 1 ? "1 day ago" : `${days} days ago`;
  if (hours > 0) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (minutes > 0) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  return "just now";
};

const KIND: Record<string, { icon: React.ReactNode; tint: string; wash: string }> = {
  success: { icon: <CheckCircle2 size={17} />, tint: "#2E7D1F", wash: "rgba(46,125,31,0.10)" },
  error: { icon: <AlertCircle size={17} />, tint: "#C0503F", wash: "rgba(192,80,63,0.10)" },
  message: { icon: <MessageSquare size={17} />, tint: "#2F7F86", wash: "rgba(47,127,134,0.10)" },
  info: { icon: <Info size={17} />, tint: INK, wash: "rgba(23,80,15,0.07)" },
};
const kindOf = (type?: string) => KIND[type ?? ""] ?? KIND.info;

type Tab = "all" | "unread";

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    isDropdownOpen: isOpen,
    setIsDropdownOpen: setIsOpen,
  } = useNotificationStore();
  const [tab, setTab] = useState<Tab>("unread");

  useEffect(() => {
    fetchNotifications(userId);
  }, [userId, fetchNotifications]);

  const shown = useMemo(
    () => (tab === "unread" ? notifications.filter((n) => !n.is_read) : notifications),
    [notifications, tab],
  );
  const fresh = shown.filter((n) => !n.is_read);
  const earlier = shown.filter((n) => n.is_read);

  const markAll = () => notifications.filter((n) => !n.is_read).forEach((n) => markAsRead(n.id));
  const close = () => setIsOpen(false);

  return (
    <>
      {/* eslint-disable-next-line no-restricted-syntax -- a bespoke square icon trigger with a count badge */}
      <button
        onClick={() => {
          if (!isOpen) setTab("unread"); // each time it opens, start on what's new
          setIsOpen(!isOpen);
        }}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="relative w-10 h-10 rounded-xl bg-[#F7F4EA] hover:bg-[#EEF4DD] flex items-center justify-center text-[#1D6315] transition-all"
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-swing" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#287624] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Modal
        open={isOpen}
        onClose={close}
        size="md"
        title="Notifications"
        panelStyle={{
          background: `radial-gradient(120% 60% at 100% 0%, rgba(166,207,8,0.10), transparent 60%), ${PAPER}`,
          border: `1px solid ${RULE}`,
          boxShadow: "0 30px 80px -20px rgba(23,80,15,0.35), 0 2px 0 rgba(255,255,255,0.8) inset",
        }}
      >
        {/* ---- header */}
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-4">
          <div
            aria-hidden="true"
            className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(166,207,8,0.22)", color: INK, boxShadow: `inset 0 0 0 1.5px ${INK}` }}
          >
            <Bell size={19} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="m-0 text-[22px] leading-none font-semibold" style={{ fontFamily: "var(--font-display)", color: INK }}>
              Notifications
            </p>
            <p className="m-0 mt-1.5 text-[13px] font-semibold" style={{ color: INK_SOFT }}>
              {unreadCount > 0 ? `${unreadCount} unread` : notifications.length > 0 ? "You're all caught up" : "Nothing yet"}
            </p>
          </div>
          <Button iconOnly size="sm" variant="tertiary" aria-label="Close notifications" onClick={close}>
            <X size={18} />
          </Button>
        </div>

        {notifications.length > 0 && (
          <div className="px-6 pb-3 flex items-center justify-between gap-3">
            <div role="tablist" aria-label="Filter notifications" className="inline-flex p-1 rounded-full" style={{ background: "rgba(23,80,15,0.06)" }}>
              {(["unread", "all"] as const).map((t) => {
                const on = tab === t;
                return (
                  // eslint-disable-next-line no-restricted-syntax -- a segmented-control pill, not a design-system button
                  <button
                    key={t}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(t)}
                    className="relative px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition-colors"
                    style={{ color: on ? INK : INK_SOFT }}
                  >
                    {on && (
                      <motion.span
                        layoutId="notif-tab"
                        className="absolute inset-0 rounded-full bg-white"
                        style={{ boxShadow: "0 1px 3px rgba(23,80,15,0.16)" }}
                        transition={{ type: "spring", stiffness: 500, damping: 36 }}
                      />
                    )}
                    <span className="relative">
                      {t === "all" ? "All" : "Unread"}
                      {t === "unread" && unreadCount > 0 && (
                        <span className="ml-1.5 inline-block min-w-[18px] px-1 rounded-full text-[10.5px] leading-[18px] text-center" style={{ background: LIME, color: INK }}>
                          {unreadCount}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {unreadCount > 0 && (
              <Button size="sm" variant="tertiary" leadingIcon={<CheckCheck size={15} />} onClick={markAll}>
                Mark all read
              </Button>
            )}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${RULE}` }} />

        {/* ---- list, or the parked plane */}
        {shown.length > 0 ? (
          <div className="max-h-[min(58vh,460px)] overflow-y-auto notif-scroll px-3 py-3">
            {fresh.length > 0 && <Group label="New" items={fresh} onRead={markAsRead} offset={0} />}
            {earlier.length > 0 && <Group label="Earlier" items={earlier} onRead={markAsRead} offset={fresh.length} />}
          </div>
        ) : (
          <div className="px-8 pt-6 pb-9 text-center">
            <MomentArt art={EMPTY_NOTIFICATIONS_ART} width={notifications.length > 0 ? 170 : 230} float shadow={false} className="mx-auto -mb-4" />
            <p className="m-0 mt-3 text-[19px] font-semibold" style={{ fontFamily: "var(--font-display)", color: INK }}>
              {notifications.length > 0 ? "Nothing unread" : "All quiet on the runway"}
            </p>
            <p className="m-0 mt-1.5 mx-auto max-w-[280px] text-[13.5px] leading-relaxed font-medium" style={{ color: INK_SOFT }}>
              {notifications.length > 0
                ? "You've read everything. New updates will land here."
                : "No notifications yet. When something comes in for you, it'll land right here."}
            </p>
          </div>
        )}
      </Modal>

      <style jsx global>{`
        .notif-scroll::-webkit-scrollbar { width: 4px; }
        .notif-scroll::-webkit-scrollbar-track { background: transparent; }
        .notif-scroll::-webkit-scrollbar-thumb { background: rgba(23, 80, 15, 0.14); border-radius: 10px; }
        @keyframes notif-swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing { animation: notif-swing 2s ease-in-out infinite; transform-origin: top center; }
        @media (prefers-reduced-motion: reduce) { .animate-swing { animation: none; } }
      `}</style>
    </>
  );
};

function Group({ label, items, onRead, offset }: { label: string; items: Notification[]; onRead: (id: string) => void; offset: number }) {
  return (
    <section className="mb-1 last:mb-0">
      <p className="m-0 px-3 pt-1 pb-2 text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: INK_FAINT }}>
        {label}
      </p>
      <ul className="m-0 p-0 list-none space-y-1.5">
        {items.map((n, i) => (
          <Item key={n.id} n={n} onRead={onRead} index={offset + i} />
        ))}
      </ul>
    </section>
  );
}

function Item({ n, onRead, index }: { n: Notification; onRead: (id: string) => void; index: number }) {
  const k = kindOf(n.type);
  const unread = !n.is_read;
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + Math.min(index, 8) * 0.04, duration: 0.28, ease: "easeOut" }}
      className="relative flex gap-3.5 rounded-2xl px-3.5 py-3.5"
      style={{
        background: unread ? "#FFFFFF" : "transparent",
        boxShadow: unread ? `0 0 0 1px ${RULE}, 0 4px 14px -8px rgba(23,80,15,0.25)` : "none",
      }}
    >
      {unread && (
        <span aria-hidden="true" className="absolute left-1.5 top-4 bottom-4 w-[3px] rounded-full" style={{ background: LIME }} />
      )}
      <div
        aria-hidden="true"
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: k.wash, color: k.tint, opacity: unread ? 1 : 0.75 }}
      >
        {k.icon}
      </div>
      <div className="flex-1 min-w-0">
        {n.title && (
          <h4 className="m-0 text-[14px] leading-snug" style={{ color: INK, fontWeight: unread ? 800 : 700, opacity: unread ? 1 : 0.75 }}>
            {n.title}
          </h4>
        )}
        <p className="m-0 mt-0.5 text-[13px] leading-relaxed" style={{ color: unread ? INK_SOFT : INK_FAINT, fontWeight: 600 }}>
          {n.message}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="m-0 text-[11.5px] font-semibold" style={{ color: INK_FAINT }}>
            {timeAgo(n.created_at)}
          </p>
          {unread && (
            <Button size="sm" variant="tertiary" onClick={() => onRead(n.id)} className="!h-7 !px-2.5 !text-[12px]">
              Mark read
            </Button>
          )}
        </div>
      </div>
    </motion.li>
  );
}
