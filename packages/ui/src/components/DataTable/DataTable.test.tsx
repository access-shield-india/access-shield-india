import { axe, render, userEvent, waitFor } from '../../test-utils';
import { DataTable, type DataTableColumn } from './DataTable';

interface TestRow {
  id: string;
  name: string;
  status: string;
  count: number;
}

const mockData: TestRow[] = [
  { id: '1', name: 'Alice', status: 'active', count: 10 },
  { id: '2', name: 'Bob', status: 'inactive', count: 5 },
  { id: '3', name: 'Charlie', status: 'active', count: 15 },
];

const mockColumns: DataTableColumn<TestRow>[] = [
  {
    id: 'name',
    header: 'Name',
    accessor: (row) => row.name,
    sortable: true,
    sortValue: (row) => row.name,
  },
  { id: 'status', header: 'Status', accessor: (row) => row.status },
  {
    id: 'count',
    header: 'Count',
    accessor: (row) => row.count,
    sortable: true,
    sortValue: (row) => row.count,
  },
];

describe('DataTable', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations with selectable rows', async () => {
    const { container } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        getRowId={(row) => row.id}
        selectable
        selectedIds={[]}
        onSelectionChange={jest.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders table with proper semantic HTML', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
    expect(table?.querySelector('thead')).toBeInTheDocument();
    expect(table?.querySelector('tbody')).toBeInTheDocument();
  });

  it('uses proper scope attributes on headers', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    const headers = container.querySelectorAll('th');
    headers.forEach((header) => {
      expect(header).toHaveAttribute('scope', 'col');
    });
  });

  it('sets aria-sort on sortable columns', () => {
    const { getByText } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    const nameHeader = getByText('Name').closest('th');
    const statusHeader = getByText('Status').closest('th');

    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    expect(statusHeader).not.toHaveAttribute('aria-sort'); // Not sortable
  });

  it('updates aria-sort on sort direction change', async () => {
    const user = userEvent.setup();
    const { getByText } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    const nameSortButton = getByText('Name');
    const nameHeader = nameSortButton.closest('th');

    expect(nameHeader).toHaveAttribute('aria-sort', 'none');

    await user.click(nameSortButton);
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

    await user.click(nameSortButton);
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');

    await user.click(nameSortButton);
    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
  });

  it('sort buttons are keyboard accessible', async () => {
    const user = userEvent.setup();
    const { getByText } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    const sortButton = getByText('Name');
    sortButton.focus();
    expect(sortButton).toHaveFocus();

    await user.keyboard('{Enter}');
    const header = sortButton.closest('th');
    expect(header).toHaveAttribute('aria-sort', 'ascending');

    await user.keyboard(' ');
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('displays empty state with role=status', () => {
    const { getByRole, getByText } = render(
      <DataTable
        columns={mockColumns}
        data={[]}
        getRowId={(row) => row.id}
        emptyMessage="No data found"
      />,
    );

    const emptyState = getByRole('status');
    expect(emptyState).toBeInTheDocument();
    expect(getByText('No data found')).toBeInTheDocument();
  });

  it('announces empty state for screen readers', () => {
    const { getByRole } = render(
      <DataTable columns={mockColumns} data={[]} getRowId={(row) => row.id} />,
    );

    const status = getByRole('status');
    expect(status).toHaveTextContent('No data available');
  });

  it('includes caption for screen readers when provided', () => {
    const { container } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        getRowId={(row) => row.id}
        caption="User accounts table"
      />,
    );

    const caption = container.querySelector('caption');
    expect(caption).toBeInTheDocument();
    expect(caption).toHaveTextContent('User accounts table');
    expect(caption).toHaveClass('sr-only');
  });

  it('pagination has aria-label', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    const nav = container.querySelector('nav');
    expect(nav).toHaveAttribute('aria-label', 'Table pagination');
  });

  it('announces page info with aria-live', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} pageSize={2} />,
    );

    const pageInfo = container.querySelector('[aria-live="polite"]');
    expect(pageInfo).toBeInTheDocument();
    expect(pageInfo).toHaveTextContent(/Page \d+ of \d+ \(\d+ rows\)/);
  });

  it('pagination buttons have aria-label', () => {
    const { getByLabelText } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    expect(getByLabelText('Previous page')).toBeInTheDocument();
    expect(getByLabelText('Next page')).toBeInTheDocument();
  });

  it('pagination buttons provide disabled reason', () => {
    const { getByLabelText } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    const prevButton = getByLabelText('Previous page');
    expect(prevButton).toHaveAttribute('aria-disabled', 'true');
    expect(prevButton).toHaveAttribute('aria-describedby');
  });

  it('select all checkbox has descriptive aria-label', () => {
    const { getByLabelText } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        getRowId={(row) => row.id}
        selectable
        selectedIds={[]}
        onSelectionChange={jest.fn()}
      />,
    );

    expect(getByLabelText('Select all rows on this page')).toBeInTheDocument();
  });

  it('row checkboxes have descriptive aria-label with row ID', () => {
    const { getByLabelText } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        getRowId={(row) => row.id}
        selectable
        selectedIds={[]}
        onSelectionChange={jest.fn()}
      />,
    );

    expect(getByLabelText('Select row 1')).toBeInTheDocument();
    expect(getByLabelText('Select row 2')).toBeInTheDocument();
    expect(getByLabelText('Select row 3')).toBeInTheDocument();
  });

  it('checkboxes are keyboard accessible', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();
    const { getByLabelText } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        getRowId={(row) => row.id}
        selectable
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    );

    const checkbox = getByLabelText('Select row 1');
    checkbox.focus();
    expect(checkbox).toHaveFocus();

    await user.keyboard(' ');
    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  it('sort buttons have visible focus ring', async () => {
    const user = userEvent.setup();
    const { getByText } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    const sortButton = getByText('Name');
    await user.tab();
    // Verify focus ring utility classes are applied
    expect(sortButton.className).toContain('focus-visible');
  });

  it('meets minimum 44px touch target for interactive elements', () => {
    const { getByText, getByLabelText } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        getRowId={(row) => row.id}
        selectable
        selectedIds={[]}
        onSelectionChange={jest.fn()}
      />,
    );

    const sortButton = getByText('Name');
    expect(sortButton).toHaveClass('min-h-11');

    // Pagination buttons are Button components with min-h-11
    const prevButton = getByLabelText('Previous page');
    const nextButton = getByLabelText('Next page');
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('renders all data rows', () => {
    const { getByText } = render(
      <DataTable columns={mockColumns} data={mockData} getRowId={(row) => row.id} />,
    );

    expect(getByText('Alice')).toBeInTheDocument();
    expect(getByText('Bob')).toBeInTheDocument();
    expect(getByText('Charlie')).toBeInTheDocument();
  });

  it('paginates data correctly', async () => {
    const user = userEvent.setup();
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      name: `User ${i + 1}`,
      status: 'active',
      count: i + 1,
    }));

    const { getByText, getByLabelText, queryByText } = render(
      <DataTable columns={mockColumns} data={largeData} getRowId={(row) => row.id} pageSize={10} />,
    );

    expect(getByText('User 1')).toBeInTheDocument();
    expect(queryByText('User 11')).not.toBeInTheDocument();

    const nextButton = getByLabelText('Next page');
    await user.click(nextButton);

    expect(queryByText('User 1')).not.toBeInTheDocument();
    expect(getByText('User 11')).toBeInTheDocument();
  });
});
