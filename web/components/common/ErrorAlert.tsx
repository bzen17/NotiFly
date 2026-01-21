'use client';
import React from 'react';
import Alert from '@mui/material/Alert';

export default function ErrorAlert({ message }: { message?: string }) {
  return <Alert severity="error">{message ?? 'An error occurred'}</Alert>;
}
