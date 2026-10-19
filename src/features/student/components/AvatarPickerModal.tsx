import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, width: '100%', maxWidth: 460,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', position: 'relative'
      }}>
        <button aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94A3B8', padding: 4
          }}
        >
          <X size={20} />
        </button>

        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A202C', margin: '0 0 8px 0', fontFamily: "var(--font-display)" }}>Choose your avatar</h2>
          <p style={{ fontSize: 14, color: '#4A5568', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            Pick the picture that shows up on your profile and in the sidebar.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, justifyItems: 'center' }}>
            {OPTIONS.map((option) => {
              const isSelected = option.id === selectedId;
              return (
                <button
                  key={option.id}
                  aria-label={option.label}
                  aria-pressed={isSelected}
                  onClick={() => { onSelect(option.id); onClose(); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    position: 'relative', width: '100%', maxWidth: 72,
                  }}
                >
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: '50%',
                    border: isSelected ? '3px solid #F0AD4E' : '3px solid #E2E8F0',
                    boxShadow: isSelected ? '0 6px 16px #F0AD4E40' : 'none',
                    overflow: 'hidden', transition: 'border 0.2s, box-shadow 0.2s',
                  }}>
                    <StudentAvatar id={option.id} size={72} alt="" />
                  </div>
                  {isSelected && (
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#F0AD4E', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid white',
                    }}>
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
