'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface LiveSearchInputProps {
  /** The URL param name — defaults to "q" */
  paramName?: string;
  /** The HTML name attribute for form submission — defaults to paramName */
  name?: string;
  /** Initial value from server-rendered searchParams */
  defaultValue?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Debounce delay in ms — defaults to 350 */
  debounceMs?: number;
  /** Base path to navigate to (e.g. "/motors") */
  basePath: string;
}

/**
 * A client-side search input that debounces keystrokes and updates the URL
 * query param without requiring the user to press Enter / click Apply.
 * It preserves all other existing search params (sort, dir, pageSize, etc.)
 * and always resets to page=1 when the query changes.
 */
export function LiveSearchInput({
  paramName = 'q',
  name,
  defaultValue = '',
  placeholder = 'Search…',
  id,
  className,
  debounceMs = 350,
  basePath,
}: LiveSearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the last q that we pushed to the URL so we don't push identical values
  const lastPushedRef = useRef(defaultValue);

  // Sync if the URL param changes externally (e.g. user hits browser Back)
  useEffect(() => {
    const urlValue = searchParams.get(paramName) ?? '';
    if (urlValue !== value) {
      setValue(urlValue);
      lastPushedRef.current = urlValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, paramName]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      if (next === lastPushedRef.current) return;
      lastPushedRef.current = next;

      // Build new URL: keep all current params, update q, reset page to 1
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set(paramName, next);
      } else {
        params.delete(paramName);
      }
      params.set('page', '1');

      startTransition(() => {
        router.push(`${basePath}?${params.toString()}`);
      });
    }, debounceMs);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <input
      type="text"
      id={id}
      name={name ?? paramName}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
      className={className}
    />
  );
}
