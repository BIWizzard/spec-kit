# KGiQ Branding Specification
## Family Finance Web Application

### Overview
The Family Finance web application is a product under the KGiQ freelance brand, focusing on professional data intelligence and business solutions. The UI design should reflect the KGiQ brand identity while providing an intuitive, glassmorphic user experience.

## Color Palette

### Primary Brand Colors
```css
/* KGiQ Brand Colors */
--kgiq-primary: #FFD166;        /* Golden yellow - primary accent */
--kgiq-secondary: #8FAD77;      /* Sage green - success/positive */
--kgiq-tertiary: #5E7F9B;       /* Blue-gray - professional/stable */
```

### UI Theme Colors (Dark Theme Primary)
```css
/* Dark Theme Base */
--bg-primary: #0F172A;          /* Very dark blue-gray background */
--bg-secondary: #1E293B;        /* Medium dark blue-gray */
--bg-tertiary: #334155;         /* Lighter blue-gray for cards */

/* Glass/Transparency Effects */
--glass-bg: rgba(51, 65, 85, 0.6);      /* Glassmorphic card background */
--glass-border: rgba(255, 209, 102, 0.2); /* Golden border with transparency */
--glass-shadow: rgba(0, 0, 0, 0.3);      /* Subtle shadow for depth */

/* Header Bar */
--header-bg: rgba(30, 41, 59, 0.85);    /* Semi-transparent dark background */
--header-border: rgba(255, 209, 102, 0.1); /* Subtle golden border */
```

### Semantic Colors
```css
/* Status Colors */
--success: #8FAD77;             /* Sage green for success states */
--warning: #FFD166;             /* Golden yellow for warnings */
--error: #EF4444;               /* Red for errors */
--info: #5E7F9B;                /* Blue-gray for info */

/* Text Colors */
--text-primary: #F8FAFC;        /* High contrast white */
--text-secondary: #CBD5E1;      /* Medium contrast gray */
--text-muted: #94A3B8;          /* Lower contrast gray */
--text-accent: #FFD166;         /* Golden accent text */
```

## Typography

### Font Stack
```css
/* Primary Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

/* Monospace for code/data */
font-family: 'Fira Code', 'SF Mono', Monaco, Consolas, monospace;
```

### Font Weights & Sizes
```css
/* Font Weights */
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Font Sizes */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
```

## Layout & Spacing

### Spacing Scale
```css
/* Spacing Variables */
--space-1: 0.25rem;      /* 4px */
--space-2: 0.5rem;       /* 8px */
--space-3: 0.75rem;      /* 12px */
--space-4: 1rem;         /* 16px */
--space-5: 1.25rem;      /* 20px */
--space-6: 1.5rem;       /* 24px */
--space-8: 2rem;         /* 32px */
--space-10: 2.5rem;      /* 40px */
--space-12: 3rem;        /* 48px */
--space-16: 4rem;        /* 64px */
```

### Border Radius
```css
--radius-sm: 0.25rem;    /* 4px - small elements */
--radius-md: 0.375rem;   /* 6px - buttons, inputs */
--radius-lg: 0.5rem;     /* 8px - cards */
--radius-xl: 0.75rem;    /* 12px - large cards */
--radius-2xl: 1rem;      /* 16px - modals */
--radius-full: 50%;      /* Circular elements */
```

## Component Design Patterns

### Header Bar
```css
.header {
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 50;
}
```

### Glassmorphic Cards
```css
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow:
    0 8px 32px var(--glass-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: var(--space-6);
  transition: all 0.3s ease;
}

.glass-card:hover {
  border-color: rgba(255, 209, 102, 0.4);
  transform: translateY(-2px);
  box-shadow:
    0 12px 48px var(--glass-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: var(--kgiq-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  padding: var(--space-3) var(--space-6);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #F7C93D; /* Slightly darker golden */
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 209, 102, 0.4);
}

/* Glass Button */
.btn-glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: var(--space-3) var(--space-6);
  transition: all 0.2s ease;
}
```

## Logo Usage

### Logo Placement
- **Header**: KGiQ logo positioned in top-left corner
- **Loading States**: Centered logo with subtle animation
- **Footer**: Small logo with copyright information

### Logo Variants
```css
/* Logo Container */
.logo-container {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.logo-svg {
  height: 32px; /* Header size */
  width: auto;
}

.logo-large {
  height: 48px; /* Landing/loading page size */
}

.logo-small {
  height: 24px; /* Footer/compact size */
}
```

## Glassmorphism Implementation

### CSS Properties
```css
/* Core Glassmorphism Properties */
.glassmorphic {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

/* Dark Theme Glassmorphism */
.glassmorphic-dark {
  background: rgba(51, 65, 85, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 209, 102, 0.2);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

## Animation & Interactions

### Micro-interactions
```css
/* Subtle hover animations */
.interactive-element {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.interactive-element:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Golden glow effect */
.accent-glow:hover {
  box-shadow: 0 0 20px rgba(255, 209, 102, 0.3);
}
```

### Loading Animations
```css
/* KGiQ logo pulse animation */
@keyframes logo-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.logo-loading {
  animation: logo-pulse 2s ease-in-out infinite;
}
```

## Accessibility

### Contrast Ratios
- **Primary text on dark background**: 21:1 (AAA compliance)
- **Secondary text**: 7:1 (AA compliance)
- **Golden accent on dark**: 4.5:1 minimum

### Focus States
```css
.focusable:focus {
  outline: 2px solid var(--kgiq-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

## Implementation Guidelines

### CSS Custom Properties Setup
1. Define all brand variables in `:root`
2. Use CSS custom properties for all brand colors
3. Implement dark theme as default with light theme override option
4. Ensure all glassmorphic effects have fallbacks for older browsers

### Component Library Structure
```
frontend/src/styles/
├── globals.css           # Global styles & CSS variables
├── components/
│   ├── glass-card.css   # Glassmorphic card styles
│   ├── buttons.css      # Button variants
│   └── header.css       # Header/navigation styles
└── themes/
    ├── dark.css         # Dark theme (default)
    └── light.css        # Light theme (optional)
```

### Responsive Design
- Mobile-first approach
- Maintain glassmorphic effects on mobile (with performance considerations)
- Ensure KGiQ logo remains legible at all screen sizes
- Optimize touch targets for mobile interaction

## Brand Voice & Messaging

### Tone
- **Professional yet approachable**
- **Data-driven and intelligent**
- **Trustworthy for family finances**
- **Innovative and modern**

### Messaging Themes
- "Intelligent family finance management"
- "Data-driven financial insights"
- "Professional tools for personal finance"
- "KGiQ-powered financial intelligence"