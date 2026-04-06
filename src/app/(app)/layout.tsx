import BottomNav from '@/components/BottomNav';

export default function LogsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav />
    </>
  );
}
