# [Directory Name] Context

**TYPE**: LEAF NODE
**PARENT**: [parent/path/]

---

## ### LOGIC_CONTRACTS ###

### functionName
[PATH]: ./functionName.js
[INTENT]: One-sentence description of what this function does
[SIGNATURE]: (params: { paramA: TypeA, paramB: TypeB }) => ReturnType
[INPUT]:
  - paramA: TypeA (req) - Description
  - paramB: TypeB (opt) - Description with default value
[OUTPUT]: ReturnType - Description of return value
[THROWS]:
  - Error: "Message" - When condition
[TRUTH_SOURCE]: Internal `arrayName` array or External API
[DEPENDS_ON]: ./otherFile.js, lib/module
[USED_BY]: ConsumerA, ConsumerB

### anotherFunction
[PATH]: ./anotherFunction.js
...

---

## ### COMPONENT_CONTRACTS ###

### ComponentName
[PATH]: ./ComponentName.jsx
[INTENT]: One-sentence description
[PROPS]:
  - propA: PropType (req) - Description
  - propB: PropType (opt) - Default: defaultValue
[BEHAVIOR]:
  - Logic: Delegates to `useHookName` hook
  - State: Internal/Managed by parent/Uses context
  - Events: onClick emits to parent via onCallback prop
[DEPENDS_ON]: ./useHookName.js, lib/constants

### useHookName
[PATH]: ./useHookName.js
[INTENT]: Hook description
[RETURNS]: { stateA: Type, handlerB: Function }
[SIDE_EFFECTS]: Fetches from API, localStorage read/write

---

## ### DEPENDENCIES ###

[LOCAL]: ./siblingFile.js, ./index.js
[EXTERNAL]: lib/auth, logic/rules/proposals
[EXPORTS]: functionA, ComponentB, useHookC

---

## ### CONSTANTS ###

[ARRAY_NAME]: ['value1', 'value2', 'value3']
[CONFIG_OBJECT]: { key: value }

---

**FILE_COUNT**: N
**EXPORTS_COUNT**: M
