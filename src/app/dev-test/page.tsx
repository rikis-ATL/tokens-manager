import dynamic from 'next/dynamic';

const AtuiDevTest = dynamic(() => import('@/components/AtuiDevTest'), { ssr: false });

export default function DevTestPage() {
  return <AtuiDevTest />;
}
