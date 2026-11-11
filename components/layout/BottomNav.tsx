import { Gamepad2, Gift, ShoppingBag, Trophy, UserCircle2 } from 'lucide-react';

const tabs = [
  { id: 'Play', icon: Gamepad2 },
  { id: 'Ranks', icon: Trophy },
  { id: 'Shop', icon: ShoppingBag },
  { id: 'Claim', icon: Gift },
  { id: 'Me', icon: UserCircle2 },
];

export function BottomNav({ activeTab, onSelect }: { activeTab: string; onSelect: (tab: string) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {tabs.map(({ id, icon: Icon }) => (
        <button
          key={id}
          className={`nav-item ${id === activeTab ? 'active' : ''}`}
          type="button"
          aria-current={id === activeTab ? 'page' : undefined}
          onClick={() => onSelect(id)}
        >
          <Icon size={18} />
          <span>{id}</span>
        </button>
      ))}
    </nav>
  );
}
