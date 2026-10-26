import React, { useState } from 'react';

/** Philippine mobile number: 11 digits starting with 09. */
export const isValidMobile = (v: string) => /^09\d{9}$/.test(v);

/** Phone field that only accepts digits (max 11) and says what's wrong while typing. */
export function PhoneInput({
  value,
  onChange,
  required,
  className,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
}) {
  const [touched, setTouched] = useState(false);
  const problem =
    !value
      ? required && touched
        ? 'Mobile number is required'
        : ''
      : !value.startsWith('09')
        ? 'Must start with 09'
        : value.length !== 11
          ? `${value.length}/11 digits`
          : '';
  return (
    <div>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={11}
        required={required}
        pattern="09[0-9]{9}"
        title="11-digit mobile number starting with 09"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
        onBlur={() => setTouched(true)}
        placeholder="09XXXXXXXXX"
        className={`${className || ''} tabular-nums ${problem && touched ? '!border-red-400' : ''}`}
        aria-invalid={!!problem && touched}
      />
      {problem && (touched || value.length >= 11) && <p className="text-xs text-red-600 mt-1">{problem}</p>}
    </div>
  );
}
