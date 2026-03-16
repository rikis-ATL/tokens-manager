import dynamic from 'next/dynamic';

const AtuiDevTest = dynamic(() => import('@/components/dev/AtuiDevTest'), { ssr: false });

export default function DevTestPage() {
  return <AtuiDevTest />;
}
