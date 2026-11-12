import { AppShell, type TabId } from '@/components/shell/AppShell';

const TABS: TabId[] = ['play', 'ranks', 'shop', 'rewards', 'me'];

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = TABS.includes(tab as TabId) ? (tab as TabId) : 'play';
  return <AppShell initialTab={initialTab} />;
}
