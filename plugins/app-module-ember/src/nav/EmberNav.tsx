import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarGroup,
  SidebarItem,
  SidebarSpace,
  useSidebarOpenState,
  useSidebarPinState,
} from '@backstage/core-components';
import {
  identityApiRef,
  useApi,
  useApiHolder,
} from '@backstage/core-plugin-api';
import type {
  NavContentComponentProps,
  NavContentNavItem,
} from '@backstage/plugin-app-react';
import {
  SearchModal,
  SearchModalProvider,
  useSearchModal,
} from '@backstage/plugin-search';
import {
  NotificationsSidebarItem,
  notificationsApiRef,
} from '@backstage/plugin-notifications';
import {
  Bell as BellIcon,
  BookOpen,
  Bot,
  Braces,
  Ellipsis,
  Flame,
  House,
  LayoutGrid,
  PanelLeft,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useNeedsYouCount } from './useNeedsYouCount';
import styles from './Nav.module.css';

const ICON_PROPS = { size: 18, strokeWidth: 1.75, 'aria-hidden': true } as const;

/** Ember line icons for the pages the nav knows; other pages keep theirs. */
const PAGE_ICONS: Record<string, LucideIcon> = {
  'page:home': House,
  'page:catalog': LayoutGrid,
  'page:cloud-agents': Bot,
  'page:api-docs': Braces,
  'page:techdocs': BookOpen,
  'page:scaffolder': Plus,
};

const asIcon = (Icon: LucideIcon): ComponentType => () => <Icon {...ICON_PROPS} />;

function iconFor(item: NavContentNavItem): ComponentType {
  const Icon = PAGE_ICONS[item.node.spec.id];
  return Icon ? asIcon(Icon) : () => <>{item.icon}</>;
}

export function needsYouLabel(count: number): string {
  return `${count} ${count === 1 ? 'agent needs' : 'agents need'} you`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

/** Opens the search modal on ⌘K, Ctrl+K and `/`, as the palette does. */
function useSearchHotkeys(toggle: () => void, open: boolean) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      } else if (
        event.key === '/' &&
        !open &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggle, open]);
}

function Brand() {
  const { isOpen } = useSidebarOpenState();
  return (
    <RouterLink
      to="/"
      aria-label="Home"
      className={`${styles.brand} ${isOpen ? '' : styles.brandClosed}`}
    >
      <span className={styles.brandMark} aria-hidden="true">
        <Flame size={16} strokeWidth={1.75} />
      </span>
      {isOpen && (
        <span className={styles.brandName}>
          Backstage
          <small>{typeof window === 'undefined' ? '' : window.location.host}</small>
        </span>
      )}
    </RouterLink>
  );
}

function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  const { isOpen } = useSidebarOpenState();
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <button
      type="button"
      className={`${styles.searchTrigger} ${isOpen ? '' : styles.searchTriggerClosed}`}
      onClick={onOpen}
      aria-label={`Search Backstage (${isMac ? 'Command' : 'Control'} K)`}
      aria-keyshortcuts={isMac ? 'Meta+K /' : 'Control+K /'}
    >
      <Search size={15} strokeWidth={1.75} aria-hidden="true" />
      {isOpen && (
        <>
          <span className={styles.searchLabel}>Search</span>
          <span className={styles.kbd} aria-hidden="true">
            {isMac ? '⌘K' : 'Ctrl K'}
          </span>
        </>
      )}
    </button>
  );
}

/**
 * The ember bar beside the active item. It measures the item the router
 * marked with `aria-current="page"` and slides there with a spring.
 */
function ActiveIndicator() {
  const ref = useRef<HTMLSpanElement>(null);
  const { pathname } = useLocation();
  const { isOpen } = useSidebarOpenState();
  const [offset, setOffset] = useState<number>();
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    if (offset === undefined || placed) return undefined;
    const frame = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(frame);
  }, [offset, placed]);

  useLayoutEffect(() => {
    const indicator = ref.current;
    const drawer = indicator?.parentElement;
    if (!indicator || !drawer) return undefined;
    const measure = () => {
      const active = drawer.querySelector<HTMLElement>('a[aria-current="page"]');
      if (!active) {
        setOffset(undefined);
        return;
      }
      const top =
        active.getBoundingClientRect().top -
        drawer.getBoundingClientRect().top +
        drawer.scrollTop;
      setOffset(top + (active.offsetHeight - 20) / 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(drawer);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => observer.disconnect();
  }, [pathname, isOpen]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={[
        styles.indicator,
        offset === undefined ? '' : styles.indicatorVisible,
        placed ? styles.indicatorAnimated : '',
      ].join(' ')}
      style={offset === undefined ? undefined : { transform: `translateY(${offset}px)` }}
    />
  );
}

function BadgedIcon({ Icon, count }: { Icon: LucideIcon; count?: number }) {
  const { isOpen } = useSidebarOpenState();
  return (
    <span className={styles.iconWrap}>
      <Icon {...ICON_PROPS} />
      {!isOpen && !!count && <span className={styles.dot} aria-hidden="true" />}
    </span>
  );
}

function MobileOnly({ children }: { children: ReactNode }) {
  const { isMobile } = useSidebarPinState();
  return isMobile ? <>{children}</> : null;
}

interface Profile {
  name: string;
  picture?: string;
}

function useProfile(): Profile {
  const identityApi = useApi(identityApiRef);
  const [profile, setProfile] = useState<Profile>({ name: 'Settings' });
  useEffect(() => {
    let active = true;
    identityApi
      .getProfileInfo()
      .then(info => {
        if (!active) return;
        const name = info.displayName?.trim() || info.email?.split('@')[0] || 'Settings';
        setProfile(info.picture ? { name, picture: info.picture } : { name });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [identityApi]);
  return profile;
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]![0], parts[parts.length - 1]![0]] : [name[0], name[1]];
  return letters.filter(Boolean).join('').toUpperCase();
}

function Avatar({ profile, size }: { profile: Profile; size: number }) {
  return profile.picture ? (
    <img className={styles.avatar} src={profile.picture} alt="" width={size} height={size} />
  ) : (
    <span className={styles.avatar} style={{ width: size, height: size }} aria-hidden="true">
      {initials(profile.name)}
    </span>
  );
}

function AccountItem({ href }: { href: string }) {
  const profile = useProfile();
  const firstName = profile.name.split(' ')[0] ?? profile.name;
  return (
    <SidebarItem
      to={href}
      text={firstName}
      aria-label={`Settings for ${profile.name}`}
      icon={() => <Avatar profile={profile} size={24} />}
    />
  );
}

function Notifications() {
  const apis = useApiHolder();
  if (!apis.get(notificationsApiRef)) return null;
  return <NotificationsSidebarItem icon={asIcon(BellIcon)} />;
}

function CollapseItem() {
  const { isPinned, toggleSidebarPinState } = useSidebarPinState();
  return (
    <SidebarItem
      icon={asIcon(PanelLeft)}
      text={isPinned ? 'Collapse' : 'Expand'}
      aria-pressed={!isPinned}
      onClick={toggleSidebarPinState}
    />
  );
}

function MobileTopBar({ title, onSearch, settingsHref }: {
  title: string;
  onSearch: () => void;
  settingsHref: string;
}) {
  const profile = useProfile();
  return (
    <header className={styles.topBar}>
      <span className={styles.brandMark} aria-hidden="true">
        <Flame size={16} strokeWidth={1.75} />
      </span>
      <span className={styles.topBarTitle}>{title}</span>
      <button type="button" className={styles.iconButton} aria-label="Search" onClick={onSearch}>
        <Search {...ICON_PROPS} />
      </button>
      <RouterLink to={settingsHref} className={styles.iconButton} aria-label="Account settings">
        <Avatar profile={profile} size={28} />
      </RouterLink>
    </header>
  );
}

function titleFor(pathname: string, items: NavContentNavItem[]): string {
  const match = items
    .filter(item =>
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.title ?? 'Backstage';
}

function EmberSidebar({ navItems }: NavContentComponentProps) {
  const { state, toggleModal } = useSearchModal();
  const { isMobile } = useSidebarPinState();
  const { pathname } = useLocation();
  const needsYou = useNeedsYouCount();
  useSearchHotkeys(toggleModal, state.open && !state.hidden);

  navItems.take('page:search');
  navItems.take('page:notifications');
  const settings = navItems.take('page:user-settings');
  const settingsHref = settings?.href ?? '/settings';

  const item = (navItem: NavContentNavItem | undefined, extra?: { badge?: number }) => {
    if (!navItem) return null;
    const Icon = PAGE_ICONS[navItem.node.spec.id];
    const badge = extra?.badge;
    return (
      <SidebarItem
        key={navItem.node.spec.id}
        to={navItem.href}
        text={navItem.title}
        aria-label={badge ? `${navItem.title}, ${needsYouLabel(badge)}` : navItem.title}
        icon={Icon ? () => <BadgedIcon Icon={Icon} count={badge} /> : iconFor(navItem)}
      >
        {!!badge && (
          <span className={styles.badge} aria-hidden="true">
            {badge}
          </span>
        )}
      </SidebarItem>
    );
  };

  const home = navItems.take('page:home');
  const catalog = navItems.take('page:catalog');
  const agents = navItems.take('page:cloud-agents');
  const apis = navItems.take('page:api-docs');
  const docs = navItems.take('page:techdocs');
  const create = navItems.take('page:scaffolder');
  const rest = [...navItems.rest()].sort((a, b) => a.title.localeCompare(b.title));
  const all = [home, catalog, agents, apis, docs, create, settings, ...rest].filter(
    (navItem): navItem is NavContentNavItem => !!navItem,
  );

  return (
    <>
      {isMobile && (
        <MobileTopBar title={titleFor(pathname, all)} onSearch={toggleModal} settingsHref={settingsHref} />
      )}
      <Sidebar disableExpandOnHover>
        <Brand />
        <SidebarGroup label="Search" icon={<Search {...ICON_PROPS} />} to="/search" priority={2}>
          <SearchTrigger onOpen={toggleModal} />
        </SidebarGroup>
        {home && (
          <SidebarGroup label={home.title} icon={<House {...ICON_PROPS} />} to={home.href} priority={5}>
            {item(home)}
          </SidebarGroup>
        )}
        {catalog && (
          <SidebarGroup label={catalog.title} icon={<LayoutGrid {...ICON_PROPS} />} to={catalog.href} priority={4}>
            {item(catalog)}
          </SidebarGroup>
        )}
        {agents && (
          <SidebarGroup
            label="Agents"
            icon={<BadgedIconMobile count={needsYou} />}
            to={agents.href}
            priority={3}
          >
            {item(agents, { badge: needsYou })}
          </SidebarGroup>
        )}
        <SidebarGroup label="More" icon={<Ellipsis {...ICON_PROPS} />} priority={1}>
          {item(apis)}
          {item(docs)}
          {item(create)}
          {rest.map(navItem => item(navItem))}
          <MobileOnly>
            <Notifications />
            <AccountItem href={settingsHref} />
          </MobileOnly>
        </SidebarGroup>
        <ActiveIndicator />
        <SidebarSpace />
        <div className={styles.divider} role="presentation" />
        <Notifications />
        <AccountItem href={settingsHref} />
        <CollapseItem />
      </Sidebar>
      <SearchModal {...state} toggleModal={toggleModal} />
    </>
  );
}

function BadgedIconMobile({ count }: { count?: number }) {
  return (
    <span className={styles.iconWrap}>
      <Bot {...ICON_PROPS} />
      {!!count && <span className={styles.dot} aria-hidden="true" />}
      {!!count && <span className={styles.srOnly}>{`, ${needsYouLabel(count)}`}</span>}
    </span>
  );
}

/** The Ember shell navigation, rendered by `nav-content:app/ember`. */
export function EmberNav(props: NavContentComponentProps) {
  return (
    <SearchModalProvider>
      <EmberSidebar {...props} />
    </SearchModalProvider>
  );
}
