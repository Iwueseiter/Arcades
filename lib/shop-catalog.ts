import { keccak256, toBytes, type Hex } from 'viem';

export type ShopItem = {
  slug: string;
  name: string;
  price: number;
  accent: 'gold' | 'mint' | 'violet' | 'coral';
  blurb: string;
};

// Prices are whole G$. Keep in sync with contracts/script/Deploy.s.sol.
export const SHOP_ITEMS: ShopItem[] = [
  { slug: 'starter-pack', name: 'Starter Pack', price: 5, accent: 'gold', blurb: 'A fresh coin trail and a badge that shows you were here early.' },
  { slug: 'combo-boost', name: 'Combo Boost', price: 12, accent: 'mint', blurb: 'Neon streak meter and a louder combo chime.' },
  { slug: 'lucky-capsule', name: 'Lucky Capsule', price: 18, accent: 'violet', blurb: 'Unlocks the prism token skin for every run.' },
  { slug: 'vip-pass', name: 'VIP Pass', price: 25, accent: 'coral', blurb: 'Gold name on the leaderboard and a VIP crown on your profile.' },
];

export const itemIdFor = (slug: string): Hex => keccak256(toBytes(slug));
