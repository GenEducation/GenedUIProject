import React, { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2, MessageSquare, Info, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "../store/useNotificationStore";

interface NotificationBellProps {
  userId: string;
  align?: "left" | "right";
}

const timeAgo = (date: string | Date) => {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  
  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days === 1 ? "1 day ago" : `${days} days ago`;
  if (hours > 0) return hours === 1 ? "1 hour ago" : `${hours} hour ago`;
  if (minutes > 0) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  return "just now";
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId, align = "right" }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    initStream,
    isDropdownOpen: isOpen,
    setIsDropdownOpen: setIsOpen
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(userId);
    const unsub = initStream(userId);
    return () => unsub();
  }, [userId, fetchNotifications, initStream]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type?: string) => {
    switch (type) {
      case "success": return <CheckCircle2 size={16} className="text-green-500" />;
      case "error": return <AlertCircle size={16} className="text-red-500" />;
      case "message": return <MessageSquare size={16} className="text-blue-500" />;
      default: return <Info size={16} className="text-[#1a3a2a]/60" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-xl bg-[#F4F3EE] hover:bg-[#E5F2E9] flex items-center justify-center text-[#1a3a2a] transition-all group"
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-swing" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#059669] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-[0_20px_60px_rgba(26,58,42,0.12)] border border-[#1a3a2a]/5 overflow-hidden z-50`}
          >
            <div className="p-5 border-b border-[#1a3a2a]/5 flex items-center justify-between bg-[#FBFBFA]">
              <div>
                <h3 className="text-sm font-black text-[#1a3a2a] uppercase tracking-widest">Notifications</h3>
                <p className="text-[10px] font-bold text-[#1a3a2a]/40 uppercase tracking-tight mt-0.5">
                  {unreadCount} UNREAD MESSAGES
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[#1a3a2a]/30 hover:text-[#1a3a2a] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="divide-y divide-[#1a3a2a]/5">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-5 flex gap-4 transition-colors group relative border-b border-[#1a3a2a]/5 last:border-b-0 ${!notif.is_read ? 'bg-[#059669]/5' : ''}`}
                    >
                      <div className="shrink-0 mt-1">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        {notif.title && (
                          <h4 className={`text-sm tracking-tight ${!notif.is_read ? 'font-black text-[#1a3a2a]' : 'font-bold text-[#1a3a2a]/70'}`}>
                            {notif.title}
                          </h4>
                        )}
                        <p className={`text-xs leading-relaxed ${!notif.is_read ? 'font-semibold text-[#1a3a2a]/90' : 'font-medium text-[#1a3a2a]/60'}`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between pt-1.5">
                          <p className="text-[10px] font-medium text-[#1a3a2a]/40 uppercase tracking-wider">
                            {timeAgo(notif.created_at)}
                          </p>
                          {!notif.is_read && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                markAsRead(notif.id);
                              }}
                              className="text-[10px] uppercase tracking-widest font-black text-[#059669] hover:bg-[#059669]/10 px-2 py-1 rounded-md transition-colors shadow-sm border border-[#059669]/20"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-[#F4F3EE] rounded-2xl flex items-center justify-center mx-auto text-[#1a3a2a]/20">
                    <Bell size={24} />
                  </div>
                  <p className="text-sm font-bold text-[#1a3a2a]/40">No new notifications</p>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(26, 58, 42, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(26, 58, 42, 0.2);
        }
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing {
          animation: swing 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>
    </div>
  );
};
