import { z } from 'zod';

const EmailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters')
  .trim()
  .toLowerCase()
  .refine(
    (email) => {
      const commonTypos = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'];
      const parts = email.split('@');
      if (parts.length < 2 || !parts[1]) return true;
      const domain = parts[1];
      return !commonTypos.includes(domain);
    },
    {
      message: 'Possible typo in email domain. Did you mean gmail.com or yahoo.com?',
    }
  );

const LoginFormDataSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

// Test 1: Validate empty email via shape
console.log('Test 1: Using .shape[field]');
try {
  const fieldSchema = LoginFormDataSchema.shape.email;
  fieldSchema.parse('');
  console.log('No error');
} catch (error) {
  console.log('Error:', error.errors);
  console.log('First error message:', error.errors?.[0]?.message);
}

// Test 2: Validate empty email via partial schema
console.log('\nTest 2: Using partial schema');
try {
  LoginFormDataSchema.partial().parse({ email: '' });
  console.log('No error');
} catch (error) {
  console.log('Error:', error.errors);
  console.log('First error message:', error.errors?.[0]?.message);
}

// Test 3: Validate empty password
console.log('\nTest 3: Validate empty password via shape');
try {
  const fieldSchema = LoginFormDataSchema.shape.password;
  fieldSchema.parse('');
  console.log('No error');
} catch (error) {
  console.log('Error:', error.errors);
  console.log('First error message:', error.errors?.[0]?.message);
}
