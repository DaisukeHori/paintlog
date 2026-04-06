import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '未認証' }, { status: 401 });
  }

  const { fileName, contentType, type } = await request.json();
  const ext = fileName.split('.').pop() || '';
  const folder = type === 'video' ? 'videos' : 'photos';
  const key = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;

  const uploadUrl = await getPresignedUploadUrl(key, contentType);
  const publicUrl = getPublicUrl(key);

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
