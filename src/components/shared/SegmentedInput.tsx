import React, { useRef, useState, useEffect } from 'react';

interface SegmentedInputProps {
  length: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

const ALPHABET_REGEX = /^[A-HJ-NP-Z2-9]$/; // A-Z minus I/O, digits 2-9

export function SegmentedInput({ length, value, onChange, disabled }: SegmentedInputProps) {
  const [activeSegment, setActiveSegment] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ensure the ref array is the right length
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValue = value.split('');
      if (newValue[index]) {
        // Clear current cell
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // Clear previous cell and focus
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    let char = e.target.value.toUpperCase();
    char = char[char.length - 1] || ''; // Get the last typed character

    if (char && ALPHABET_REGEX.test(char)) {
      const newValue = value.split('');
      newValue[index] = char;
      onChange(newValue.join('').substring(0, length));

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').toUpperCase().replace(/\s/g, '');
    const validChars = pastedData.split('').filter(c => ALPHABET_REGEX.test(c));
    
    if (validChars.length > 0) {
      const currentArr = value.split('');
      let currentIdx = activeSegment;
      
      for (let i = 0; i < validChars.length && currentIdx < length; i++) {
        currentArr[currentIdx] = validChars[i];
        currentIdx++;
      }
      
      onChange(currentArr.join(''));
      
      const focusIndex = Math.min(currentIdx, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => {
        const char = value[i] || '';
        return (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="text"
            value={char}
            disabled={disabled}
            onFocus={() => setActiveSegment(i)}
            onKeyDown={e => handleKeyDown(e, i)}
            onChange={e => handleChange(e, i)}
            onPaste={handlePaste}
            style={{
              width: '44px',
              height: '56px',
              fontSize: '24px',
              fontWeight: 800,
              textAlign: 'center',
              textTransform: 'uppercase',
              borderRadius: '12px',
              border: `2px solid ${char ? '#5B4DC7' : '#E2E8F0'}`,
              background: disabled ? '#F7F8FC' : '#FFFFFF',
              color: '#1A202C',
              outline: 'none',
              transition: 'all 0.2s',
              fontFamily: "'DM Sans', sans-serif"
            }}
            maxLength={2} // allow typing over to get the last char in handleChange
          />
        );
      })}
    </div>
  );
}
