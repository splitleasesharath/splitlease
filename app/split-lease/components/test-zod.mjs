import { SignupFormDataSchema, PasswordSchema } from './src/SignupLogin/SignupLogin.schema.ts';

console.log('Testing password validation...');
console.log('Schema shape:', SignupFormDataSchema.shape);
console.log('Password schema:', SignupFormDataSchema.shape?.password);

const testPassword = 'password123!';
console.log('\nTesting password:', testPassword);

try {
  PasswordSchema.parse(testPassword);
  console.log('✓ PasswordSchema.parse passed');
} catch (e) {
  console.log('✗ PasswordSchema.parse failed:', e.issues[0]?.message);
}

const shape = SignupFormDataSchema._def?.schema?.shape || SignupFormDataSchema.shape;
console.log('\nShape from code:', shape);
const fieldSchema = shape?.password;
console.log('Field schema:', fieldSchema);

if (fieldSchema) {
  try {
    fieldSchema.parse(testPassword);
    console.log('✓ fieldSchema.parse passed');
  } catch (e) {
    console.log('✗ fieldSchema.parse failed:', e.issues[0]?.message);
  }
}
