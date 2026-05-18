"use client";

import { useState, useEffect, useRef } from "react";

interface SageBubbleProps {
  text: string;
  delay?: number;
  typing?: boolean;
  onDone?: () => void;
}

function renderBold(html: string) {
  return html.replace(/\*\*(.+?)\*\*/g, '<b style="color:#1DB87B">$1</b>');
}

export function SageBubble({
  text,
  delay = 0,
  typing = true,
  onDone,
}: SageBubbleProps) {
  const [displayed, setDisplayed] = useState(typing ? "" : text);
  const [done, setDone] = useState(!typing);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!typing) {
      setDisplayed(text);
      setDone(true);
      onDoneRef.current?.();
      return;
    }

    setDisplayed("");
    setDone(false);
    let i = 0;
    let iv: ReturnType<typeof setInterval>;

    const timer = setTimeout(() => {
      iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(iv);
          setDone(true);
          onDoneRef.current?.();
        }
      }, 16);
    }, delay);

    return () => {
      clearTimeout(timer);
      clearInterval(iv);
    };
  }, [text, delay, typing]);

  return (
    <div
      className="inline-block max-w-full animate-[bubbleIn_0.35s_cubic-bezier(.34,1.56,.64,1)_both]"
      style={{
        padding: "11px 15px",
        borderRadius: "14px 14px 14px 4px",
        background: "rgba(11,36,71,0.06)",
        fontSize: "14.5px",
        lineHeight: 1.5,
        color: "#0B2447",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
      dangerouslySetInnerHTML={{
        __html:
          renderBold(displayed) +
          (!done
            ? '<span style="display:inline-block;width:2px;height:13px;background:#1DB87B;vertical-align:text-bottom;margin-left:1px;animation:tcursorBlink 0.9s step-end infinite"></span>'
            : ""),
      }}
    />
  );
}
