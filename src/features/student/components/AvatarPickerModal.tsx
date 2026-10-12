import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { AvatarId } from '@/features/student/store/useStudentStore';
import { STUDENT_AVATAR_IDS } from '@/constants/studentAvatars';
import { StudentAvatar } from './StudentAvatar';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedId: AvatarId;
  onSelect: (id: AvatarId) => void;
}

// Boys on the first row, girls on the second.
const OPTIONS: { id: AvatarId; label: string }[] = [...STUDENT_AVATAR_IDS].sort().map((id) => ({
  id,
  // "girl_02_pink_hoodie_braids" -> "girl pink hoodie braids"
  label: id.replace(/_\d+_/, ' ').replace(/_/g, ' '),
}));

export function AvatarPickerModal({ isOpen, onClose, selectedId, onSelect }: AvatarPickerModalProps) {
  // Esc closes, like every other dialog.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgb(18_45_48/0.45)] p-4 backdrop-blur-[4px] sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[680px] rounded-[28px] bg-white px-5 pb-8 pt-9 text-center shadow-[0_30px_70px_-24px_rgb(18_45_48/0.45)] sm:px-10 sm:pb-10 sm:pt-10"
      >
        {/* eslint-disable-next-line no-restricted-syntax -- icon-only dialog close in the corner. */}
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--canvas)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]"
        >
          <X size={20} />
        </button>

        <h2 id="avatar-picker-title" className="text-[26px] font-extrabold leading-tight text-[var(--ink)]">
          Choose your avatar
        </h2>
        <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-relaxed text-[var(--text-mid)]">
          Pick the picture that shows up on your profile and home screen.
        </p>

        <div className="mt-8 grid grid-cols-5 justify-items-center gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-6">
          {OPTIONS.map((option) => {
            const isSelected = option.id === selectedId;
            return (
              // eslint-disable-next-line no-restricted-syntax -- an avatar tile, not a text action; Button has no image-tile variant.
              <button
                key={option.id}
                aria-label={option.label}
                aria-pressed={isSelected}
                onClick={() => { onSelect(option.id); onClose(); }}
                className="group relative w-full max-w-[104px] rounded-full focus-visible:outline-none"
              >
                <div
                  className={`aspect-square w-full overflow-hidden rounded-full border-[3px] transition duration-200 group-hover:-translate-y-1 group-focus-visible:ring-4 group-focus-visible:ring-[var(--primary-ring)] ${
                    isSelected
                      ? 'border-[var(--primary)] shadow-[0_0_0_4px_var(--soft-surface),0_12px_24px_-10px_rgb(7_94_99/0.55)]'
                      : 'border-[var(--surface-border)] group-hover:border-[var(--primary)]/50 group-hover:shadow-[0_12px_24px_-12px_rgb(18_45_48/0.35)]'
                  }`}
                >
                  <StudentAvatar id={option.id} size={104} alt="" />
                </div>
                {isSelected && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm sm:h-8 sm:w-8">
                    <Check size={15} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
