export const DEFAULT_CHECKLIST_ITEMS = [
  { id: 'login', label: 'Login works correctly', description: 'A real user can sign in and reach protected areas.' },
  { id: 'email-verification', label: 'Email verification works', description: 'Verification emails are delivered and accepted.' },
  { id: 'password-reset', label: 'Password reset works', description: 'Users can request and complete a reset flow.' },
  { id: 'payments', label: 'Payments work correctly', description: 'Checkout, billing, and callbacks complete without errors.' },
  { id: 'oauth', label: 'OAuth login works', description: 'Third-party login completes end to end.' },
  { id: 'env', label: 'Production env vars are configured', description: 'Runtime secrets are present in production and not committed.' },
  { id: 'user-flows', label: 'Important user flows work', description: 'Core onboarding and retention flows behave as expected.' },
  { id: 'error-handling', label: 'Error handling has been tested', description: 'Expected failures are handled cleanly for users.' },
];
