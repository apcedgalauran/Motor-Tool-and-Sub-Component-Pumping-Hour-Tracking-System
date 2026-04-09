// @vitest-environment jsdom

import { Sidebar } from '@/components/Sidebar';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/motors',
}));

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const optionsPayload = {
  motorStatuses: [{ value: 'ON_LOCATION', label: 'On Location' }],
  partStatuses: [
    { value: 'AVAILABLE', label: 'AVAILABLE' },
    { value: 'INSTALLED', label: 'INSTALLED' },
  ],
  componentTypes: [{ value: 'ROTOR', label: 'Rotor' }],
  motors: [{ id: 'motor-1', name: 'Motor Alpha' }],
  motorFields: [{ key: 'name', label: 'Name' }],
  partFields: [{ key: 'type', label: 'Component Type' }],
};

describe('Sidebar export modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(optionsPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens and closes the export modal with the close button', async () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close export modal' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('closes the modal when clicking the backdrop', async () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));

    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement;
    expect(backdrop).toBeTruthy();
    if (!backdrop) return;

    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});