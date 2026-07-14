import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Badge } from '../Badge';
import { DataTable } from './DataTable';

interface Issue {
  id: string;
  rule: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
}

const data: Issue[] = [
  { id: '1', rule: 'image-alt', severity: 'critical' },
  { id: '2', rule: 'color-contrast', severity: 'serious' },
  { id: '3', rule: 'label', severity: 'moderate' },
];

const meta: Meta<typeof DataTable<Issue>> = {
  title: 'Components/DataTable',
  component: DataTable,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataTable<Issue>>;

function TableDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <DataTable
      caption="Accessibility issues"
      data={data}
      getRowId={(r) => r.id}
      selectable
      selectedIds={selected}
      onSelectionChange={setSelected}
      columns={[
        {
          id: 'rule',
          header: 'Rule',
          accessor: (r) => r.rule,
          sortable: true,
          sortValue: (r) => r.rule,
        },
        {
          id: 'severity',
          header: 'Severity',
          accessor: (r) => <Badge severity={r.severity} />,
          sortable: true,
          sortValue: (r) => r.severity,
        },
      ]}
    />
  );
}

export const Default: Story = {
  render: () => <TableDemo />,
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};

export const Empty: Story = {
  args: {
    data: [],
    getRowId: (r: Issue) => r.id,
    columns: [{ id: 'rule', header: 'Rule', accessor: (r: Issue) => r.rule }],
    emptyMessage: 'No issues found — great job!',
  },
};
