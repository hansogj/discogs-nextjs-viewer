// This side-effect import augments vitest's `Assertion` interface with the
// jest-dom matcher types (toBeInTheDocument, toHaveAttribute, ...). Without
// it tsc reports errors on the matcher calls in *.test.tsx files even though
// the runtime works.
import "@testing-library/jest-dom/vitest";
