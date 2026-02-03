import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import AppShell from '../components/layout/AppShell';

vi.mock('../components/layout/Header', () => ({
  default: (props: any) => (
    <div data-testid="header-mock">
      <button onClick={props.onToggleSidebar}>toggle</button>
    </div>
  ),
}));
vi.mock('../components/layout/Sidebar', () => ({
  default: () => <div data-testid="sidebar-mock" />,
}));

describe('AppShell', () => {
  test('renders children and layout', () => {
    const { getByTestId } = render(
      <AppShell>
        <div data-testid="child">hello</div>
      </AppShell>,
    );
    expect(getByTestId('header-mock')).toBeInTheDocument();
    expect(getByTestId('sidebar-mock')).toBeInTheDocument();
    expect(getByTestId('child')).toHaveTextContent('hello');
  });
});
