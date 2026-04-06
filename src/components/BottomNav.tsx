'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
const tabs = [
  { href: '/logs', label: '記録', icon: '📋' },
  { href: '/logs/new', label: '新規', icon: '✚' },
  { href: '/analysis', label: '分析', icon: '📊' },
  { href: '/settings', label: '設定', icon: '⚙' },
];
export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="pl-nav">
      <div className="pl-nav-inner">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/logs/new' && pathname.startsWith(tab.href + '/'));
          return <Link key={tab.href} href={tab.href} className={`pl-nav-item ${active ? 'active' : ''}`}><span className="pl-nav-icon">{tab.icon}</span><span>{tab.label}</span></Link>;
        })}
      </div>
    </nav>
  );
}
