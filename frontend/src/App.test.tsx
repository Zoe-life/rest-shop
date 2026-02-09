import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Rest Shop application', () => {
  render(<App />);
  const heading = screen.getByText(/Rest Shop/i);
  expect(heading).toBeInTheDocument();
});
