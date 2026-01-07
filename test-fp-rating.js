// Test file to demonstrate fp-rater skill
const users = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
  { name: 'Charlie', age: 35, active: true }
];

// Pure function - filters and transforms
const getActiveUserNames = (users) =>
  users
    .filter(user => user.active)
    .map(user => user.name.toUpperCase());

// Impure - has side effect (console.log)
function logUsers(users) {
  console.log('Users:', users);
  return users;
}

// Mixed - some FP patterns but mutates array
function addUser(users, newUser) {
  users.push(newUser);  // Mutation!
  return users;
}

export { getActiveUserNames, logUsers, addUser };
