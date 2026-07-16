import React, { useState } from 'react';
import { Loader2, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { SegmentedInput } from '@/components/shared/SegmentedInput';
import { confirmDevicePairing } from '@/features/auth/authService';
import { useStudentStore } from '@/features/student/store/useStudentStore';

interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevicePairingModal({ isOpen, onClose }: DevicePairingModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // success state
  const [success, setSuccess] = useState(false);
  const [pushed, setPushed] = useState(false);

  const { studentProfile } = useStudentStore();

  if (!isOpen) return null;

  const handlePair = async () => {
    if (code.length < 6 || !studentProfile?.user_id) return;
    
    setLoading(true);
    setErrorMsg(null);
    
    try {
      const result = await confirmDevicePairing({
        user_code: code,
        student_id: studentProfile.user_id,
      });

      if (result.status === 'approved') {
        setSuccess(true);
        setPushed(result.pushed);
      } else {
        // Unexpected success shape fallback
        setErrorMsg('Pairing response was unexpected. Please try again.');
      }
    } catch (err: any) {
      let msg = 'An unexpected error occurred. Please try again.';
      if (err?.error_code) {
        switch (err.error_code) {
          case 'AUTH_1213':
            msg = 'That code is invalid or expired. Check the device screen — if it changed, enter the new code.';
            setCode(''); // Clear input for retry
            break;
          case 'AUTH_1214':
            msg = 'Only a student account can be paired. Please sign in as the student.';
            break;
          case 'AUTH_1201':
            msg = 'Authentication error. Please sign in again.';
            break;
          case 'AUTH_1206':
            msg = 'Student profile not found.';
            break;
          default:
            msg = err.message || msg;
        }
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setLoading(false);
    setErrorMsg(null);
    setSuccess(false);
    setPushed(false);
    onClose();
  };

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
          onClick={handleClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94A3B8', padding: 4
          }}
        >
          <X size={20} />
        </button>

        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {pushed ? (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E6F4EA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#137333' }}>
                    <CheckCircle size={32} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A202C', margin: '0 0 8px 0', fontFamily: "'Nunito',sans-serif" }}>Device Paired!</h2>
                    <p style={{ fontSize: 14, color: '#4A5568', margin: 0, lineHeight: 1.5 }}>It'll be ready in a few seconds.</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                    <AlertTriangle size={32} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A202C', margin: '0 0 8px 0', fontFamily: "'Nunito',sans-serif" }}>Almost there...</h2>
                    <p style={{ fontSize: 14, color: '#4A5568', margin: 0, lineHeight: 1.5 }}>
                      Pairing was approved, but we couldn't wake the device. Please restart your device and try again with the new code.
                    </p>
                  </div>
                </>
              )}
              <button
                onClick={handleClose}
                style={{
                  marginTop: 8, width: '100%', padding: '14px', borderRadius: 12,
                  background: '#5B4DC7', color: 'white', border: 'none',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A202C', margin: '0 0 8px 0', fontFamily: "'Nunito',sans-serif" }}>Pair your Deskbot</h2>
                <p style={{ fontSize: 14, color: '#4A5568', margin: 0, lineHeight: 1.5 }}>
                  Please enter the 6-character code shown on your device screen.
                </p>
              </div>

              <div style={{ padding: '8px 0' }}>
                <SegmentedInput
                  length={6}
                  value={code}
                  onChange={setCode}
                  disabled={loading}
                />
              </div>

              {errorMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#EF4444', fontSize: 13, textAlign: 'left', lineHeight: 1.4 }}>
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handlePair}
                disabled={code.length < 6 || loading}
                style={{
                  marginTop: 8, width: '100%', padding: '14px', borderRadius: 12,
                  background: code.length === 6 && !loading ? '#5B4DC7' : '#E2E8F0',
                  color: code.length === 6 && !loading ? 'white' : '#94A3B8',
                  border: 'none', fontWeight: 700, fontSize: 14,
                  cursor: code.length === 6 && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.2s',
                }}
              >
                {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                Pair Device
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
