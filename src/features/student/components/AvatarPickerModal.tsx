import React from 'react';
import { X, Check } from 'lucide-react';
import { AvatarId } from '@/features/student/store/useStudentStore';
import { StudentAvatarIllustration } from './StudentAvatarIllustration';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedId: AvatarId;
  onSelect: (id: AvatarId) => void;
}

const OPTIONS: { id: AvatarId; label: string }[] = [
  { id: 'graduate-boy', label: 'Graduate' },
  { id: 'graduate-girl', label: 'Graduate' },
];

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
        background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', position: 'relative'
      }}>
        <button
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
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A202C', margin: '0 0 8px 0', fontFamily: "'Nunito',sans-serif" }}>Choose your avatar</h2>
          <p style={{ fontSize: 14, color: '#4A5568', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            Pick the picture that shows up on your profile and in the sidebar.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 28 }}>
            {OPTIONS.map((option) => {
              const isSelected = option.id === selectedId;
              return (
                <button
                  key={option.id}
                  onClick={() => { onSelect(option.id); onClose(); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  }}
                >
                  <div style={{
                    width: 88, height: 88, borderRadius: '50%', position: 'relative',
                    border: isSelected ? '3px solid #F0AD4E' : '3px solid #E2E8F0',
                    boxShadow: isSelected ? '0 6px 16px #F0AD4E40' : 'none',
                    overflow: 'hidden', transition: 'border 0.2s, box-shadow 0.2s',
                  }}>
                    {option.id === 'graduate-boy' ? (
                      <StudentAvatarIllustration bg="#F0AD4E" />
                    ) : (
                      <img
                        src="/avatars/girl-graduate.png"
                        alt="Girl graduate avatar"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                    {isSelected && (
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 26, height: 26, borderRadius: '50%',
                        background: '#F0AD4E', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid white',
                      }}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#1A202C' : '#4A5568' }}>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
