"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Clock, X } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:MM" (24-hour format)
  onChange: (value: string) => void;
  themeColor?: string; // default "#042E5C"
  popoverDirection?: "bottom" | "right"; // default "bottom"
}

function WheelColumn({ 
  items, 
  value, 
  onChange, 
  themeColor, 
  isCyclic = false 
}: { 
  items: string[], 
  value: string, 
  onChange: (val: string) => void, 
  themeColor: string, 
  isCyclic?: boolean 
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemHeight = 36;
  
  // For cyclic scrolling, repeat items many times. 
  // 50 copies is enough for the user to feel it's infinite before we quietly reset.
  const repeatedItems = isCyclic ? Array(50).fill(items).flat() : items;
  const middleBaseIndex = isCyclic ? Math.floor(25 * items.length) : 0;
  
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = items.indexOf(value);
    return isCyclic ? middleBaseIndex + (idx >= 0 ? idx : 0) : (idx >= 0 ? idx : 0);
  });

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (index !== selectedIndex && repeatedItems[index]) {
      setSelectedIndex(index);
      onChange(repeatedItems[index]);
    }
  };

  // Debounced reset to middle for cyclic lists to prevent hitting the absolute ends
  useEffect(() => {
    if (!isCyclic) return;
    const timeoutId = setTimeout(() => {
      if (!scrollRef.current) return;
      const currentVal = repeatedItems[selectedIndex];
      const targetBaseIndex = middleBaseIndex + items.indexOf(currentVal);
      // If scrolled too far from the center copy, quietly reset position
      if (Math.abs(selectedIndex - middleBaseIndex) > items.length * 10) {
        setSelectedIndex(targetBaseIndex);
        scrollRef.current.style.scrollBehavior = 'auto';
        scrollRef.current.scrollTop = targetBaseIndex * itemHeight;
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.style.scrollBehavior = 'smooth';
        }, 50);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedIndex, isCyclic, items, middleBaseIndex, repeatedItems]);

  // Initial scroll position setup
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = selectedIndex * itemHeight;
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.style.scrollBehavior = 'smooth';
      }, 50);
    }
  }, []); // Run once on mount

  return (
    <div 
      className="h-[108px] overflow-y-auto snap-y snap-mandatory relative flex-1 hide-scroll"
      ref={scrollRef}
      onScroll={handleScroll}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="h-[36px]" /> {/* Top padding to center first item */}
      {repeatedItems.map((item, i) => {
        const isSelected = i === selectedIndex;
        return (
          <div 
            key={i} 
            className="h-[36px] flex items-center justify-center snap-center text-sm transition-all cursor-pointer select-none"
            style={{ 
              color: isSelected ? themeColor : `${themeColor}4d`,
              fontWeight: isSelected ? 900 : 500,
              transform: isSelected ? 'scale(1.15)' : 'scale(1)'
            }}
            onClick={() => {
              if (scrollRef.current) {
                 scrollRef.current.scrollTo({ top: i * itemHeight, behavior: 'smooth' });
              }
            }}
          >
            {item}
          </div>
        );
      })}
      <div className="h-[36px]" /> {/* Bottom padding */}
    </div>
  );
}

export function TimePicker({ value, onChange, themeColor = "#042E5C", popoverDirection = "bottom" }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Define wheel options
  const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minsList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const ampmList = ["AM", "PM"];

  // Parse 24h value to 12h format for local state
  let initH = "12", initM = "00", initA = "PM";
  if (value) {
    const [hStr, mStr] = value.split(":");
    let hNum = parseInt(hStr, 10);
    initA = hNum >= 12 ? "PM" : "AM";
    hNum = hNum % 12 || 12;
    initH = String(hNum).padStart(2, "0");
    initM = String(parseInt(mStr, 10)).padStart(2, "0");
  }

  const [hour, setHour] = useState(initH);
  const [minute, setMinute] = useState(initM);
  const [ampm, setAmpm] = useState(initA);

  // Sync internal state if `value` prop is cleared from outside
  useEffect(() => {
    if (!value) {
      setHour("12");
      setMinute("00");
      setAmpm("PM");
    } else {
      const [hStr, mStr] = value.split(":");
      let hNum = parseInt(hStr, 10);
      setAmpm(hNum >= 12 ? "PM" : "AM");
      hNum = hNum % 12 || 12;
      setHour(String(hNum).padStart(2, "0"));
      setMinute(String(parseInt(mStr, 10)).padStart(2, "0"));
    }
  }, [value]);

  const updateValue = (newH: string, newM: string, newA: string) => {
    let hNum = parseInt(newH, 10);
    if (newA === "PM" && hNum !== 12) hNum += 12;
    if (newA === "AM" && hNum === 12) hNum = 0;
    onChange(`${String(hNum).padStart(2, "0")}:${newM}`);
  };

  const formatDisplayTime = () => {
    if (!value) return "Select a time";
    return `${hour}:${minute} ${ampm}`;
  };

  return (
    <div ref={containerRef} className="relative">
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scroll::-webkit-scrollbar { display: none; }
      `}} />
      <div
        className="w-full flex items-center justify-between gap-3 bg-[#F4F3EE]/50 border border-[#042E5C]/5 rounded-2xl py-3.5 px-4 text-sm font-medium text-left focus-within:ring-2 focus-within:ring-opacity-10 transition-all cursor-pointer"
        style={{
          boxShadow: isOpen ? `0 0 0 2px ${themeColor}1a` : "none",
        }}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span style={{ color: value ? themeColor : `${themeColor}66` }}>{formatDisplayTime()}</span>
        
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(""); // Clear selection
            }}
            className="p-1 rounded-md transition-colors"
            style={{ color: `${themeColor}66` }}
            onMouseEnter={(e) => {
              (e.currentTarget.style.backgroundColor = `${themeColor}1a`);
              (e.currentTarget.style.color = themeColor);
            }}
            onMouseLeave={(e) => {
              (e.currentTarget.style.backgroundColor = "");
              (e.currentTarget.style.color = `${themeColor}66`);
            }}
          >
            <X size={14} className="shrink-0" />
          </button>
        ) : (
          <Clock size={16} style={{ color: `${themeColor}66` }} className="shrink-0" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`z-50 mt-2 w-full min-w-[320px] bg-white rounded-[24px] border border-[#042E5C]/5 shadow-2xl shadow-[#042E5C]/10 p-4 relative ${popoverDirection === "right" ? "md:absolute md:-top-4 md:left-[calc(100%+16px)] md:mt-0" : "absolute top-full left-0"}`}
          >
            <div className="flex items-center justify-between relative h-[108px]">
              {/* Center Highlight Bar */}
              <div 
                className="absolute top-1/2 left-0 w-full h-[36px] -translate-y-1/2 rounded-xl pointer-events-none" 
                style={{ backgroundColor: `${themeColor}0d` }} 
              />
              
              {/* Wheels */}
              <WheelColumn 
                items={hoursList} 
                value={hour} 
                onChange={(v) => { setHour(v); updateValue(v, minute, ampm); }} 
                themeColor={themeColor} 
                isCyclic 
              />
              <div className="text-xl font-black mb-1" style={{ color: `${themeColor}66` }}>:</div>
              <WheelColumn 
                items={minsList} 
                value={minute} 
                onChange={(v) => { setMinute(v); updateValue(hour, v, ampm); }} 
                themeColor={themeColor} 
                isCyclic 
              />
              <div className="w-2" />
              <WheelColumn 
                items={ampmList} 
                value={ampm} 
                onChange={(v) => { setAmpm(v); updateValue(hour, minute, v); }} 
                themeColor={themeColor} 
                isCyclic={false} 
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button 
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95"
                style={{ backgroundColor: themeColor, boxShadow: `0 4px 12px ${themeColor}33` }}
                onClick={() => {
                  if (!value) updateValue(hour, minute, ampm); // Set initial default if untouched
                  setIsOpen(false);
                }}
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
