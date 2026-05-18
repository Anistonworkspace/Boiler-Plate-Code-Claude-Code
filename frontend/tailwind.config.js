/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Monday Aniston design system tokens — map to CSS variables
        primary: {
          DEFAULT: 'var(--primary-color)',
          hover: 'var(--primary-hover-color)',
          highlighted: 'var(--primary-highlighted-color)',
          selected: 'var(--primary-selected-color)',
          300: '#7fbcf8',
          400: '#3d99f0',
          500: '#0073ea',
          600: '#0060b9',
        },
        // Text scale
        'text-primary': 'var(--primary-text-color)',
        'text-secondary': 'var(--secondary-text-color)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-muted': 'var(--text-muted)',
        // Status / semantic
        positive: 'var(--positive-color)',
        negative: 'var(--negative-color)',
        warning: 'var(--warning-color)',
        // Status pill exact values (used by .status-pill)
        status: {
          not_started: '#c4c4c4',
          working_on_it: '#fdab3d',
          in_progress: '#0073ea',
          stuck: '#df2f4a',
          done: '#00c875',
          review: '#9d50dd',
        },
        priority: {
          low: '#579bfc',
          medium: '#fdab3d',
          high: '#ff7575',
          critical: '#bb3354',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'Roboto', 'Noto Sans Hebrew', 'Noto Kufi Arabic', 'Noto Sans JP', 'sans-serif'],
        body: ['Figtree', 'Roboto', 'Noto Sans Hebrew', 'Noto Kufi Arabic', 'Noto Sans JP', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['"Space Grotesk"', 'Poppins', 'sans-serif'],
      },
      fontSize: {
        // Monday Aniston type scale
        'xxs': '10px',
        'xs': '12px',
        'sm': '13px',
        'base': '14px',
        'md': '15px',
        'lg': '17px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '30px',
      },
      borderRadius: {
        // Monday Aniston radii — only these three values
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '16px',
        // Floating card: 14px top corners only (applied manually with rounded-tl-[14px] rounded-tr-[14px])
      },
      boxShadow: {
        // Monday Aniston shadow scale
        xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
        small: '0 1px 4px 0 rgba(0,0,0,0.08)',
        medium: '0 4px 12px 0 rgba(0,0,0,0.1)',
        large: '0 8px 24px 0 rgba(0,0,0,0.12)',
        'floating-card': '0 0 0 1px rgba(0,0,0,0.06), 0 4px 16px 0 rgba(0,0,0,0.08), 0 8px 32px 0 rgba(0,0,0,0.06)',
        'floating-card-dark': '0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px 0 rgba(0,0,0,0.4)',
      },
      transitionTimingFunction: {
        // Canonical Monday Aniston easing curves
        'ui': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'sidebar': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        // Productive durations
        70: '70ms',
        100: '100ms',
        150: '150ms',
        // Expressive durations
        220: '220ms',
        250: '250ms',
        280: '280ms',
        300: '300ms',
        400: '400ms',
      },
      backdropBlur: {
        xs: '2px',
      },
      zIndex: {
        'header': '20',
        'sidebar': '30',
        'sidebar-drawer': '50',
        'dropdown': '100',
        'modal': '10000',
        'skip-link': '9999',
      },
    },
  },
  plugins: [],
};
