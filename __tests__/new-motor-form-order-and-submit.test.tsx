import { Children, type FormEvent, isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { createMotorMock, pushMock } = vi.hoisted(() => ({
  createMotorMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/actions/motor.actions', () => ({
  createMotor: createMotorMock,
}));

vi.mock('@/components/DateField', () => ({
  default: function MockDateField(_props: { name: string; label: string; placeholder?: string }) {
    return null;
  },
}));

vi.mock('@/components/asset-status-selector', () => ({
  AssetStatusSelector: function MockAssetStatusSelector() {
    return null;
  },
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');

  return {
    ...actual,
    useState: vi.fn(<T,>(initial: T) => [initial, vi.fn()] as const),
  };
});

import NewMotorPage from '@/app/motors/new/page';
import { AssetStatusSelector } from '@/components/asset-status-selector';

const originalFormData = globalThis.FormData;

function readText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(readText).join('');
  }

  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>;
    return readText(element.props.children);
  }

  return '';
}

function findElementByType(node: ReactNode, type: string): ReactElement | null {
  if (!isValidElement(node)) {
    return null;
  }

  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) {
    return element;
  }

  for (const child of Children.toArray(element.props.children)) {
    const match = findElementByType(child, type);
    if (match) {
      return match;
    }
  }

  return null;
}

function findInputByName(node: ReactNode, name: string): ReactElement | null {
  if (!isValidElement(node)) {
    return null;
  }

  const element = node as ReactElement<{ children?: ReactNode; name?: string }>;
  if (element.type === 'input' && element.props.name === name) {
    return element;
  }

  for (const child of Children.toArray(element.props.children)) {
    const match = findInputByName(child, name);
    if (match) {
      return match;
    }
  }

  return null;
}

function getContainerLabel(container: ReactElement): string {
  const children = Children.toArray((container.props as { children?: ReactNode }).children);
  const label = children.find((child): child is ReactElement => isValidElement(child) && child.type === 'label');

  if (!label) {
    return '';
  }

  return readText((label.props as { children?: ReactNode }).children).trim();
}

describe('NewMotorPage form order and submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMotorMock.mockResolvedValue(undefined);

    class MockFormData {
      private readonly data: Record<string, string | null | undefined>;

      constructor(source: unknown) {
        this.data = (source ?? {}) as Record<string, string | null | undefined>;
      }

      get(name: string): FormDataEntryValue | null {
        const value = this.data[name];
        return value == null ? null : String(value);
      }
    }

    globalThis.FormData = MockFormData as unknown as typeof FormData;
  });

  afterAll(() => {
    globalThis.FormData = originalFormData;
  });

  it('renders Serial Number before Motor Name / ID and keeps required first fields', () => {
    const tree = NewMotorPage();
    const form = findElementByType(tree, 'form');

    expect(form).toBeTruthy();
    if (!form) return;

    const topLevelChildren = Children.toArray((form.props as { children?: ReactNode }).children).filter(
      (child): child is ReactElement => isValidElement(child)
    );

    expect(topLevelChildren.length).toBeGreaterThanOrEqual(7);
    expect(getContainerLabel(topLevelChildren[0])).toBe('Serial Number *');
    expect(getContainerLabel(topLevelChildren[1])).toBe('Motor Name / ID *');
    expect(getContainerLabel(topLevelChildren[2])).toBe('Location');

    const dateChildren = Children.toArray((topLevelChildren[3].props as { children?: ReactNode }).children).filter(
      (child): child is ReactElement => isValidElement(child)
    );

    expect(dateChildren.map((child) => (child.props as { label?: string }).label)).toEqual(['Date Out', 'Date In']);
    // Index 4 is the Motor Specifications section
    expect(topLevelChildren[5].type).toBe(AssetStatusSelector);

    const serialInput = findInputByName(form, 'serialNumber');
    const nameInput = findInputByName(form, 'name');

    expect(serialInput).toBeTruthy();
    expect(nameInput).toBeTruthy();
    if (!serialInput || !nameInput) return;

    expect((serialInput.props as { required?: boolean }).required).toBe(true);
    expect((serialInput.props as { placeholder?: string }).placeholder).toBe('Unique serial number');
    expect((nameInput.props as { required?: boolean }).required).toBe(true);
    expect((nameInput.props as { placeholder?: string }).placeholder).toBe('e.g. Motor A');
  });

  it('submits successfully with the swapped field order', async () => {
    const tree = NewMotorPage();
    const form = findElementByType(tree, 'form');

    expect(form).toBeTruthy();
    if (!form) return;

    const onSubmit = (form.props as { onSubmit?: (event: FormEvent<HTMLFormElement>) => Promise<void> }).onSubmit;
    expect(typeof onSubmit).toBe('function');
    if (!onSubmit) return;

    const preventDefault = vi.fn();

    await onSubmit({
      preventDefault,
      currentTarget: {
        name: 'Motor A',
        serialNumber: 'SN-1001',
        location: 'Rig 4',
        dateOut: '2026-04-01',
        dateIn: '2026-04-08',
        status: 'ON_LOCATION',
        customStatusId: '',
      },
    } as unknown as FormEvent<HTMLFormElement>);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(createMotorMock).toHaveBeenCalledTimes(1);
    expect(createMotorMock).toHaveBeenCalledWith({
      name: 'Motor A',
      serialNumber: 'SN-1001',
      location: 'Rig 4',
      dateOut: '2026-04-01',
      dateIn: '2026-04-08',
      status: 'IDLE',
      sapId: undefined,
      assetType: undefined,
      size: undefined,
      brandType: undefined,
      connection: undefined,
    });
    expect(pushMock).toHaveBeenCalledWith('/motors');
  });
});