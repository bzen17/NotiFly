import React from 'react';
import { render, screen } from '@testing-library/react';
import Loading from './Loading';

describe('Loading component', () => {
  it('renders a progress element', () => {
    render(<Loading />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
