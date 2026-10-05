"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parentService, type LinkedStudent } from "../services/parentService";
import { assignStudentAvatars } from "../utils/studentAvatars";
import { GlassSkeleton } from "./loader/GlassSkeleton";

/**
 * Portal entry screen for parents with more than one linked child: "Who are
 * you checking on today?". Picking a child hands off to that child's
 * dashboard. The palette is the GenEd "Deep Ocean + Citron" brand sheet,
 * scoped to this screen so the rest of the portal is untouched.
 */

// Past this many children, show the first (MAX_VISIBLE - 1) and an
// "All Profiles" tile that expands to the full list.
const MAX_VISIBLE = 4;

// Below md the picker shows one profile at a time: swipe on touch screens,
// previous/next buttons wherever there's a precise pointer (laptops).
const COMPACT_QUERY = "(max-width: 767px)";
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

// A drag counts as a swipe past this distance (px, velocity-weighted).
const SWIPE_THRESHOLD = 70;

const THEME = {
  "--gd-ocean": "#115A60",
  "--gd-citron": "#D7EA7C",
  "--gd-paper": "#F5F6F1",
  "--gd-mist": "#D2E8E3",
  "--gd-ink": "#132829",
} as React.CSSProperties;

type Grades = Record<string, number | null>;

type ParentStudentPickerProps =
  | { loading: true; students?: never; onSelect?: never }
  | { loading?: false; students: LinkedStudent[]; onSelect: (studentId: string) => void };

export function ParentStudentPicker(props: ParentStudentPickerProps) {
  const reduceMotion = useReducedMotion();
  const students = useMemo(() => props.students ?? [], [props.students]);
  const [expanded, setExpanded] = useState(false);
  const [grades, setGrades] = useState<Grades>({});
  const compact = useMediaQuery(COMPACT_QUERY);
  const finePointer = useMediaQuery(FINE_POINTER_QUERY);

  const avatars = useMemo(
    () => assignStudentAvatars(students.map((s) => s.student_id)),
    [students],
  );

  // Grade is fetched per child — the linked-students payload doesn't carry it.
  const idsKey = students.map((s) => s.student_id).join(",");
  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",");
    let cancelled = false;
    Promise.allSettled(ids.map((id) => parentService.fetchStudentGrade(id))).then((results) => {
      if (cancelled) return;
      const next: Grades = {};
      results.forEach((r, i) => {
        next[ids[i]] = r.status === "fulfilled" ? r.value : null;
      });
      setGrades(next);
    });
    return () => { cancelled = true; };
  }, [idsKey]);

  const overflowing = students.length > MAX_VISIBLE;
  const visible = overflowing && !expanded ? students.slice(0, MAX_VISIBLE - 1) : students;
  const hiddenCount = students.length - visible.length;

  const renderStudentTile = (student: LinkedStudent, large: boolean) => {
    const name = student.name || `Student ID: ...${student.student_id.slice(-4)}`;
    return (
      <ProfileTile
        label={`View ${name}'s dashboard`}
        onClick={() => props.onSelect?.(student.student_id)}
        title={name}
        subtitle={<GradeLine grade={grades[student.student_id]} />}
        reduceMotion={!!reduceMotion}
        large={large}
      >
        {/* scaled a touch so the icon's baked-in white edge sits outside the clip */}
        <img
          src={avatars[student.student_id]}
          alt=""
          width={260}
          height={260}
          draggable={false}
          className="h-full w-full scale-[1.035] select-none rounded-full object-cover"
        />
      </ProfileTile>
    );
  };

  const rise = reduceMotion ? 0 : 18;
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.08, delayChildren: 0.05 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: rise },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div
      style={THEME}
      className="relative min-h-screen w-full overflow-x-hidden bg-[var(--gd-paper)] text-[var(--gd-ink)] font-[family-name:var(--font-display)]"
    >
      <Decorations />

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center px-4 pb-16 pt-[9vh] sm:pt-[11vh]"
      >
        <motion.img
          variants={item}
          src="/brand/gened-logo-deep-ocean-transparent.png"
          alt="GenEd"
          width={354}
          height={140}
          className="h-auto w-[232px] select-none sm:w-[284px]"
          draggable={false}
        />

        <motion.h1
          variants={item}
          className="mt-8 text-center text-[26px] font-bold leading-tight tracking-[-0.01em] sm:mt-10 sm:text-[34px]"
        >
          Who are you checking on today?
        </motion.h1>
        <motion.p
          variants={item}
          className="mt-2 text-center text-[15px] text-[var(--gd-ink)]/55 sm:text-[17px]"
        >
          Select a student profile to view their learning dashboard
        </motion.p>

        {compact ? (
          <motion.div variants={item} className="mt-10 w-full">
            {props.loading ? (
              <div aria-busy="true" aria-label="Your children" className="flex flex-col items-center pt-3">
                <TileSkeleton large />
              </div>
            ) : (
              <StudentCarousel
                students={students}
                showArrows={finePointer}
                reduceMotion={!!reduceMotion}
                renderTile={(student) => renderStudentTile(student, true)}
              />
            )}
          </motion.div>
        ) : (
          <motion.ul
            variants={container}
            aria-label="Your children"
            aria-busy={props.loading || undefined}
            className="mt-16 flex w-full flex-wrap justify-center gap-x-14 gap-y-12"
          >
            {props.loading
              ? [0, 1, 2].map((i) => (
                  <motion.li key={i} variants={item}>
                    <TileSkeleton />
                  </motion.li>
                ))
              : visible.map((student) => (
                  <motion.li key={student.student_id} variants={item} layout={!reduceMotion}>
                    {renderStudentTile(student, false)}
                  </motion.li>
                ))}

            {!props.loading && overflowing && !expanded && (
              <motion.li variants={item}>
                <ProfileTile
                  label={`Show all ${students.length} profiles`}
                  onClick={() => setExpanded(true)}
                  title="All Profiles"
                  subtitle={`${hiddenCount} more ${hiddenCount === 1 ? "student" : "students"}`}
                  reduceMotion={!!reduceMotion}
                >
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--gd-mist)]/55">
                    <GroupAddIcon className="w-[34%]" />
                  </span>
                </ProfileTile>
              </motion.li>
            )}
          </motion.ul>
        )}

        {!compact && !props.loading && overflowing && expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-12 rounded-full px-5 py-2 text-sm font-semibold text-[var(--gd-ocean)] transition-colors hover:bg-[var(--gd-mist)]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gd-ocean)]"
          >
            Show fewer
          </button>
        )}
      </motion.main>
    </div>
  );
}

function ProfileTile({
  label,
  onClick,
  title,
  subtitle,
  reduceMotion,
  large = false,
  children,
}: {
  label: string;
  onClick: () => void;
  title: string;
  subtitle: React.ReactNode;
  reduceMotion: boolean;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className="group flex w-full cursor-pointer flex-col items-center rounded-3xl text-center outline-none"
    >
      <span
        className={`relative block aspect-square ${large ? "w-48" : "w-44"} rounded-full ring-[var(--gd-citron)] ring-offset-[var(--gd-paper)] shadow-[0_10px_30px_-18px_rgba(17,90,96,0.55)] transition-shadow duration-300 group-hover:ring-4 group-hover:ring-offset-4 group-focus-visible:ring-offset-4 group-hover:shadow-[0_22px_40px_-20px_rgba(17,90,96,0.6)] group-focus-visible:ring-4 group-focus-visible:ring-[var(--gd-ocean)]`}
      >
        <span className="block h-full w-full overflow-hidden rounded-full transition-transform duration-500 ease-out group-hover:scale-[1.04]">
          {children}
        </span>
      </span>
      <span className={`mt-5 block truncate text-[20px] font-bold ${large ? "max-w-[14rem]" : "max-w-[11rem]"}`}>{title}</span>
      <span className="mt-1 block min-h-[1.5rem] text-[16px] text-[var(--gd-ink)]/55">{subtitle}</span>
    </motion.button>
  );
}

/**
 * One profile at a time for narrow screens. Swiping (or dragging) moves
 * between children; the optional arrows do the same for mouse/trackpad users,
 * and Left/Right arrow keys work while focus is inside.
 */
function StudentCarousel({
  students,
  showArrows,
  reduceMotion,
  renderTile,
}: {
  students: LinkedStudent[];
  showArrows: boolean;
  reduceMotion: boolean;
  renderTile: (student: LinkedStudent) => React.ReactNode;
}) {
  const [[rawIndex, direction], setPage] = useState<[number, number]>([0, 0]);
  const count = students.length;
  const index = Math.min(rawIndex, Math.max(count - 1, 0));
  const current = students[index];

  // A swipe ends with a pointerup over the tile's button; swallow the click
  // it would otherwise produce so swiping never opens a dashboard.
  const dragged = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= count || next === index) return;
      refocus.current = !!viewportRef.current?.contains(document.activeElement);
      setPage([next, next > index ? 1 : -1]);
    },
    [count, index],
  );

  // Keep keyboard focus on the profile when it's swapped out from under it.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    viewportRef.current?.querySelector<HTMLElement>("[data-active] button")?.focus();
  }, [index]);

  if (!current) return null;

  const distance = reduceMotion ? 0 : 240;
  const slide: Variants = {
    enter: (d: number) => ({ x: d * distance, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 320, damping: 32 } },
    exit: (d: number) => ({ x: -d * distance, opacity: 0, transition: { duration: 0.2 } }),
  };

  const onDragEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    const swipe = offset.x + velocity.x * 0.2;
    if (swipe < -SWIPE_THRESHOLD) goTo(index + 1);
    else if (swipe > SWIPE_THRESHOLD) goTo(index - 1);
  };

  const name = (s: LinkedStudent) => s.name || `Student ID: ...${s.student_id.slice(-4)}`;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Your children"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
      }}
      className="flex w-full flex-col items-center"
    >
      <div className="flex w-full items-center justify-center gap-2">
        {showArrows && count > 1 && (
          <CarouselArrow side="prev" disabled={index === 0} onClick={() => goTo(index - 1)} />
        )}

        {/* Padded so the hover lift and focus ring aren't clipped. */}
        <div ref={viewportRef} className="grid w-[15.5rem] overflow-hidden px-4 pb-2 pt-3">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={current.student_id}
              data-active
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              drag={count > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onPointerDown={() => { dragged.current = false; }}
              onDragStart={() => { dragged.current = true; }}
              onDragEnd={onDragEnd}
              onClickCapture={(e) => {
                if (dragged.current) { e.preventDefault(); e.stopPropagation(); }
              }}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              className="flex touch-pan-y justify-center [grid-area:1/1]"
            >
              {renderTile(current)}
            </motion.div>
          </AnimatePresence>
        </div>

        {showArrows && count > 1 && (
          <CarouselArrow side="next" disabled={index === count - 1} onClick={() => goTo(index + 1)} />
        )}
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center gap-0.5">
          {students.map((s, i) => (
            <button
              key={s.student_id}
              type="button"
              aria-label={`Show ${name(s)}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => goTo(i)}
              className="group/dot flex h-6 items-center px-1 outline-none"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 group-focus-visible/dot:outline-2 group-focus-visible/dot:outline-offset-2 group-focus-visible/dot:outline-[var(--gd-ocean)] ${
                  i === index ? "w-6 bg-[var(--gd-ocean)]" : "w-2 bg-[var(--gd-ocean)]/20 group-hover/dot:bg-[var(--gd-ocean)]/40"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {name(current)}, {index + 1} of {count}
      </p>
    </div>
  );
}

function CarouselArrow({
  side,
  disabled,
  onClick,
}: {
  side: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "prev" ? "Previous profile" : "Next profile"}
      disabled={disabled}
      onClick={onClick}
      className="mb-14 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--gd-mist)] bg-white/70 text-[var(--gd-ocean)] shadow-[0_6px_18px_-12px_rgba(17,90,96,0.6)] transition-all hover:bg-[var(--gd-mist)]/70 active:scale-95 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gd-ocean)]"
    >
      <Icon size={20} strokeWidth={2.4} />
    </button>
  );
}

function TileSkeleton({ large = false }: { large?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <GlassSkeleton className={`aspect-square ${large ? "w-48" : "w-44"} rounded-full`} />
      <GlassSkeleton className="mt-5 h-5 w-24 rounded-full" />
      <GlassSkeleton className="mt-2 h-4 w-16 rounded-full" />
    </div>
  );
}

/** Live `matchMedia` result; false on the server and where matchMedia is absent. */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** undefined = still loading; null = unavailable, so the line is left empty. */
function GradeLine({ grade }: { grade: number | null | undefined }) {
  if (grade === undefined) {
    return <GlassSkeleton className="mx-auto h-3.5 w-16 rounded-full" />;
  }
  if (grade === null) return null;
  return <>Grade {grade}</>;
}

function GroupAddIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 56" aria-hidden className={className} fill="var(--gd-ocean)">
      {/* side figures */}
      <circle cx="13" cy="21" r="6.5" />
      <path d="M1 46c0-7.2 5.4-12.5 12-12.5 3 0 5.6 1 7.6 2.8C17.8 39.4 16 43.5 16 48H3a2 2 0 0 1-2-2Z" />
      <circle cx="51" cy="21" r="6.5" />
      <path d="M63 46c0-7.2-5.4-12.5-12-12.5-3 0-5.6 1-7.6 2.8C46.2 39.4 48 43.5 48 48h13a2 2 0 0 0 2-2Z" />
      {/* centre figure, drawn over the sides with a paper-coloured halo */}
      <circle cx="32" cy="16" r="9.5" stroke="var(--gd-mist)" strokeWidth="2.5" />
      <path
        d="M16.5 49c0-9.6 7-16.5 15.5-16.5S47.5 39.4 47.5 49a3 3 0 0 1-3 3h-25a3 3 0 0 1-3-3Z"
        stroke="var(--gd-mist)"
        strokeWidth="2.5"
      />
      {/* plus */}
      <path d="M55 1.5v12M49 7.5h12" stroke="var(--gd-ocean)" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

/** Soft brand shapes in the corners, redrawn as SVG from the design reference. */
function Decorations() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* top-right: partial disc + citron sparkle dashes */}
      <svg className="absolute -right-24 -top-28 w-[300px] sm:-right-10 sm:-top-24 sm:w-[360px]" viewBox="0 0 360 360">
        <circle cx="250" cy="110" r="170" fill="var(--gd-mist)" opacity="0.45" />
        <circle cx="280" cy="70" r="120" fill="var(--gd-mist)" opacity="0.35" />
        <path d="M58 218 L80 199" stroke="var(--gd-citron)" strokeWidth="7" strokeLinecap="round" />
        <path d="M88 252 L100 227" stroke="var(--gd-citron)" strokeWidth="7" strokeLinecap="round" />
      </svg>

      {/* bottom-left: nested discs + a thin outline arc */}
      <svg className="absolute -bottom-40 -left-40 w-[440px] sm:-bottom-32 sm:-left-28 sm:w-[560px]" viewBox="0 0 560 560">
        <circle cx="170" cy="400" r="280" fill="var(--gd-mist)" opacity="0.4" />
        <circle cx="150" cy="430" r="190" fill="var(--gd-mist)" opacity="0.55" />
        <circle cx="400" cy="480" r="190" fill="none" stroke="var(--gd-mist)" strokeWidth="5" />
      </svg>
    </div>
  );
}
