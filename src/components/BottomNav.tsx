'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const tabs = [
  { href: '/logs', label: '記録一覧', icon: '📋' },
  { href: '/logs/new', label: '新規作成', icon: '➕' },
  { href: '/analysis', label: '分析', icon: '📊' },
  { href: '/settings', label: '設定', icon: '⚙️' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex justify-around items-center h-14">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1 touch-manipulation ${
                active ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-[10px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
