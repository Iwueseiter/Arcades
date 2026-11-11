import { avatarColor, initials } from '@/lib/format';

export function Avatar({ name, seed, size = 34 }: { name: string; seed?: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, background: avatarColor(seed ?? name), fontSize: size * 0.4 }}>
      {initials(name)}
    </div>
  );
}
