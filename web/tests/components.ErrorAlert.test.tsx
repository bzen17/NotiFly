import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorAlert from '../components/common/ErrorAlert';

describe('ErrorAlert', () => {
  test('renders default message when none provided', () => {
    render(<ErrorAlert />);
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  test('renders custom message', () => {
    render(<ErrorAlert message="Oops" />);
    expect(screen.getByText('Oops')).toBeInTheDocument();
  });
});
