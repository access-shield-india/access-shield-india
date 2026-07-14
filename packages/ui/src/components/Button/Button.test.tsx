import { axe, render, userEvent } from '../../test-utils';
import { Button } from './Button';

describe('Button', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations with all variants', async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders primary variant by default', () => {
    const { getByRole } = render(<Button>Default</Button>);
    const button = getByRole('button');
    expect(button).toHaveClass('bg-primary-600');
  });

  it('renders secondary variant with border', () => {
    const { getByRole } = render(<Button variant="secondary">Secondary</Button>);
    const button = getByRole('button');
    expect(button).toHaveClass('border-2');
  });

  it('renders danger variant', () => {
    const { getByRole } = render(<Button variant="danger">Delete</Button>);
    const button = getByRole('button');
    expect(button).toHaveClass('bg-error-700');
  });

  it('is keyboard accessible', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    const { getByRole } = render(<Button onClick={handleClick}>Press me</Button>);
    const button = getByRole('button');

    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('has visible focus ring on focus', async () => {
    const user = userEvent.setup();
    const { getByRole } = render(<Button>Focus test</Button>);
    const button = getByRole('button');

    await user.tab();
    expect(button).toHaveFocus();
    // Verify focus ring utility classes are applied
    expect(button.className).toContain('focus-visible');
  });

  it('uses aria-disabled instead of HTML disabled attribute', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    const button = getByRole('button');

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toHaveAttribute('disabled');
  });

  it('prevents click when disabled', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    const { getByRole } = render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );
    const button = getByRole('button');

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('provides disabled reason via aria-describedby', () => {
    const { getByRole, getByText } = render(
      <Button id="save-btn" disabled disabledReason="Form has validation errors">
        Save
      </Button>,
    );
    const button = getByRole('button');
    const reason = getByText('Form has validation errors');

    expect(button).toHaveAttribute('aria-describedby', 'save-btn-disabled-reason');
    expect(reason).toHaveClass('sr-only');
  });

  it('shows loading state with aria-busy', () => {
    const { getByRole, getByText } = render(<Button isLoading>Saving...</Button>);
    const button = getByRole('button');

    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(getByText('Loading')).toHaveClass('sr-only');
  });

  it('is focusable even when disabled for accessibility', async () => {
    const user = userEvent.setup();
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    const button = getByRole('button');

    await user.tab();
    expect(button).toHaveFocus();
  });

  it('renders all sizes with minimum 44px touch target', () => {
    const { getAllByRole, rerender } = render(<Button size="sm">Small</Button>);
    let button = getAllByRole('button')[0];
    expect(button).toHaveClass('min-h-11'); // 44px

    rerender(<Button size="md">Medium</Button>);
    button = getAllByRole('button')[0];
    expect(button).toHaveClass('min-h-11');

    rerender(<Button size="lg">Large</Button>);
    button = getAllByRole('button')[0];
    expect(button).toHaveClass('min-h-11');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Button ref={ref}>Ref test</Button>);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it('sets type to button by default', () => {
    const { getByRole } = render(<Button>Default type</Button>);
    expect(getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('allows custom type attribute', () => {
    const { getByRole } = render(<Button type="submit">Submit</Button>);
    expect(getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
