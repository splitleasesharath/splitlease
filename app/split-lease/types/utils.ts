/**
 * Utility type helpers and common type definitions
 */

/**
 * Make specific properties of T optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties of T required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Deep partial - makes all properties and nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep readonly - makes all properties and nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Extract keys of T where the value is of type V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Make all properties of T nullable
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * Remove null and undefined from T
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * Extract the type of an array element
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Promise type unwrapper
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Function that returns a promise
 */
export type AsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>;

/**
 * Extract the return type of a function, unwrapping promises
 */
export type UnwrapPromise<T> = T extends (...args: unknown[]) => Promise<infer U> ? U : T;

/**
 * Type for a generic key-value map
 */
export type Dictionary<T = unknown> = Record<string, T>;

/**
 * Type for objects that can be serialized to JSON
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

/**
 * Type for a value that may be wrapped in a function
 */
export type MaybeFunction<T> = T | (() => T);

/**
 * Type for constructors
 */
export type Constructor<T = object> = new (...args: unknown[]) => T;

/**
 * Extract method names from a type
 */
export type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? K : never;
}[keyof T];

/**
 * Extract property names (non-methods) from a type
 */
export type PropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? never : K;
}[keyof T];

/**
 * Merge two types, with properties from B overriding properties from A
 */
export type Merge<A, B> = Omit<A, keyof B> & B;

/**
 * Make certain keys of an object type optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Ensure at least one property from T is present
 */
export type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * Ensure exactly one property from T is present
 */
export type ExactlyOne<T> = {
  [K in keyof T]: Pick<T, K> & { [P in Exclude<keyof T, K>]?: never };
}[keyof T];

/**
 * Type for a value or an array of values
 */
export type OneOrMany<T> = T | T[];

/**
 * Type for coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Type for date range
 */
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

/**
 * Type for price range
 */
export interface PriceRange {
  min: number;
  max: number;
  currency?: string;
}
