import { MotorEditHistorySection } from '@/components/MotorEditHistorySection';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('MotorEditHistorySection', () => {
  it('renders changed-by user and field change summaries', () => {
    const html = renderToStaticMarkup(
      <MotorEditHistorySection
        editLogs={[
          {
            id: 'log-1',
            editedAt: '2026-04-09T14:30:00.000Z',
            user: { name: 'Amina Ali' },
            changedFields: {
              location: { previous: 'Abu Dhabi', next: 'Dubai' },
              status: { previous: 'ON_LOCATION', next: 'IN_BASE' },
            },
          },
        ]}
      />
    );

    expect(html).toContain('Edit History');
    expect(html).toContain('Amina Ali');
    expect(html).toContain('Location: Abu Dhabi -&gt; Dubai');
    expect(html).toContain('Status: On Location -&gt; In Base');
  });

  it('renders empty state when there are no edit logs', () => {
    const html = renderToStaticMarkup(<MotorEditHistorySection editLogs={[]} />);

    expect(html).toContain('No edit history yet');
  });
});
