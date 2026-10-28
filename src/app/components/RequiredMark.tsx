import React from 'react';

/** Red asterisk that marks a required field. */
export function Req() {
  return (
    <span className="text-red-600 dark:text-red-400 font-bold" aria-hidden="true">
      *
    </span>
  );
}

/** Shows a label with its " *" (required) mark in red, e.g. "First name *" or "Birthday * · Age 25". */
export function RequiredLabel({ text }: { text: string }) {
  const i = text.indexOf(' *');
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)} <Req />
      {text.slice(i + 2)}
      <span className="sr-only"> (required)</span>
    </>
  );
}
