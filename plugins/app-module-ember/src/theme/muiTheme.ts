import {
  createUnifiedTheme,
  palettes,
  pageTheme as upstreamPageThemes,
  type PageTheme,
  type UnifiedTheme,
  type UnifiedThemeOptions,
} from '@backstage/theme';
import { emberTokens } from './tokens';

const { color: c, font, radius: r, elevation: e, motion: m } = emberTokens;

const flatPage: PageTheme = {
  colors: [c.canvas, c.canvas],
  shape: 'none',
  backgroundImage: 'none',
  fontColor: c.fg1,
};

const pageTheme: Record<string, PageTheme> = Object.fromEntries(
  Object.keys(upstreamPageThemes).map(key => [key, flatPage]),
);

const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const transition = (...props: string[]) =>
  props.map(p => `${p} ${m.fast} ${m.easeOut}`).join(', ');

const components: UnifiedThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: {
      body: { backgroundColor: c.canvas, color: c.fg1 },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: { backgroundImage: 'none' },
      rounded: { borderRadius: r.lg },
      elevation1: { boxShadow: `${e.e1}, ${ring(c.line1)}` },
      elevation2: { boxShadow: `${e.e1}, ${ring(c.line1)}` },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: r.xl,
        backgroundColor: c.surface1,
        boxShadow: `${e.e1}, ${ring(c.line1)}`,
      },
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      title: { fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' },
    },
  },
  MuiDivider: {
    styleOverrides: { root: { backgroundColor: c.line1 } },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        borderRadius: r.md,
        fontWeight: 500,
        minHeight: 36,
        transition: `${transition('background-color', 'color')}, transform ${
          m.press
        } ${m.easeOut}`,
        '&:active': { transform: 'scale(.97)' },
      },
      contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      containedPrimary: {
        backgroundColor: c.ember,
        color: c.onEmber,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14)',
        '&:hover': { backgroundColor: c.emberPress },
      },
      outlined: { borderColor: c.line2 },
      text: { color: c.fg2, '&:hover': { color: c.fg1 } },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: { color: c.fg2, '&:hover': { color: c.fg1 } },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: r.md,
        backgroundColor: c.canvas,
        '&$focused $notchedOutline': { borderColor: c.emberFg, borderWidth: 1 },
      },
      notchedOutline: { borderColor: c.lineInput },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 999, backgroundColor: c.surface3, color: c.fg2 },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: c.surface3,
        color: c.fg1,
        fontSize: 12,
        borderRadius: r.sm,
        boxShadow: e.e2,
      },
    },
  },
  MuiTabs: {
    styleOverrides: { indicator: { backgroundColor: c.emberFg } },
  },
  MuiTab: {
    styleOverrides: {
      root: { textTransform: 'none', fontWeight: 500, minWidth: 0 },
    },
  },
  MuiLink: {
    styleOverrides: { root: { color: c.emberFg } },
  },
  MuiTableCell: {
    styleOverrides: {
      root: { borderBottom: `1px solid ${c.line1}` },
      head: { color: c.fg3, fontWeight: 500 },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: { backgroundColor: c.surface2, boxShadow: e.e3, borderRadius: r.xl },
    },
  },
  MuiBackdrop: {
    styleOverrides: { root: { backgroundColor: c.scrim } },
  },
  BackstageHeader: {
    styleOverrides: {
      header: {
        backgroundImage: 'none',
        backgroundColor: c.canvas,
        boxShadow: 'none',
        borderBottom: `1px solid ${c.line1}`,
        padding: '28px 40px 20px',
        '@media (max-width: 599.95px)': { padding: '20px 16px 16px' },
      },
      title: {
        color: c.fg1,
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      subtitle: { color: c.fg2 },
      type: { color: c.fg3 },
      breadcrumbTitle: { color: c.fg2 },
    },
  },
  BackstageContentHeader: {
    styleOverrides: {
      title: { fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' },
    },
  },
  BackstageInfoCard: {
    styleOverrides: {
      header: { padding: '14px 18px 10px' },
      headerTitle: { fontSize: 16, fontWeight: 600 },
    },
  },
  BackstageTable: {
    styleOverrides: {
      root: { borderRadius: r.xl, backgroundColor: c.surface1 },
    },
  },
  BackstageSidebarPage: {
    styleOverrides: {
      root: { '@media (max-width: 599.95px)': { paddingTop: 56 } },
    },
  },
  MuiBottomNavigation: {
    styleOverrides: {
      root: {
        height: 'auto',
        padding: '6px 4px calc(6px + env(safe-area-inset-bottom))',
        backgroundColor: 'rgba(15, 14, 14, .9)',
        backdropFilter: 'blur(14px)',
        borderTop: `1px solid ${c.line1} !important`,
      },
    },
  },
  MuiBottomNavigationAction: {
    defaultProps: { showLabel: true },
    styleOverrides: {
      root: {
        '&&': { flex: '1 1 0', margin: 0, maxWidth: 'none' },
        minWidth: 0,
        minHeight: 52,
        padding: '6px 0 4px',
        color: c.fg3,
        borderRadius: r.md,
        '&$selected': { color: c.fg1, paddingTop: 6, '& svg': { color: c.emberFg } },
      },
      label: {
        '&&': { display: 'block' },
        marginTop: 3,
        fontSize: 11,
        fontWeight: 500,
        '&$selected': { fontSize: 11 },
      },
    },
  },
  BackstageSidebar: {
    styleOverrides: {
      drawer: {
        backgroundColor: c.canvas,
        borderRight: `1px solid ${c.line1}`,
        paddingTop: 14,
        paddingBottom: 14,
        gap: 2,
      },
    },
  },
  BackstageSidebarItem: {
    styleOverrides: {
      root: {
        position: 'relative',
        height: 40,
        margin: '0 12px',
        borderRadius: r.md,
        color: c.fg2,
        transition: transition('background-color', 'color'),
        '&:hover': { color: c.fg1 },
      },
      open: { width: 'calc(100% - 24px) !important' },
      buttonItem: { margin: '0 12px', width: 'calc(100% - 24px)' },
      closed: { width: '44px !important' },
      label: { fontWeight: 500, fontSize: 14, width: 'auto' },
      iconContainer: {
        width: 44,
        marginRight: 0,
        '& svg': { width: 18, height: 18 },
      },
      highlightable: { '&:hover': { backgroundColor: c.surface1 } },
      highlighted: { backgroundColor: c.surface1 },
      selected: {
        '&$root': {
          borderLeft: 'none',
          backgroundColor: c.surface2,
          color: c.fg1,
        },
        '& $iconContainer': { marginLeft: 0, color: c.emberFg },
        '& $closedItemIcon': { paddingRight: 0, color: c.emberFg },
      },
    },
  },
};

/**
 * Builds the Material UI side of the Ember theme. BUI components read the
 * CSS variables that {@link emberStylesheet} sets instead.
 */
export function createEmberMuiTheme(): UnifiedTheme {
  return createUnifiedTheme({
    palette: {
      ...palettes.dark,
      background: { default: c.canvas, paper: c.surface1 },
      primary: { main: c.ember, dark: c.emberPress, contrastText: c.onEmber },
      secondary: { main: c.emberFg },
      error: { main: c.danger },
      warning: { main: c.warn },
      success: { main: c.ok },
      info: { main: c.info },
      text: { primary: c.fg1, secondary: c.fg2, disabled: c.lineInput },
      divider: c.line2,
      border: c.line2,
      textSubtle: c.fg2,
      textVerySubtle: c.fg3,
      textContrast: c.fg1,
      highlight: c.surface3,
      link: c.emberFg,
      linkHover: c.fg1,
      errorBackground: c.dangerSoft,
      warningBackground: c.warnSoft,
      infoBackground: c.surface3,
      errorText: c.danger,
      warningText: c.warn,
      infoText: c.fg1,
      status: {
        ok: c.ok,
        warning: c.warn,
        error: c.danger,
        pending: c.fg3,
        running: c.emberFg,
        aborted: c.fg3,
      },
      navigation: {
        background: c.canvas,
        indicator: 'transparent',
        color: c.fg2,
        selectedColor: c.fg1,
        navItem: { hoverBackground: c.surface1 },
        submenu: { background: c.surface2 },
      },
    },
    fontFamily: font.sans,
    defaultPageTheme: 'home',
    pageTheme,
    components,
  });
}
