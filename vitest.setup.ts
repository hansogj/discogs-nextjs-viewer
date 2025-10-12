import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/react';

// Extend vitest's expect with jest-dom matchers
expect.extend(matchers);
