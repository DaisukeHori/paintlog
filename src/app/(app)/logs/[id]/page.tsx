'use client';

import { useParams } from 'next/navigation';
import LogEditor from '@/components/LogEditor';

export default function LogDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <LogEditor existingLogId={id} />;
}
