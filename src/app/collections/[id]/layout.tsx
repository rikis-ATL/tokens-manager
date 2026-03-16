import { CollectionLayoutClient } from '@/components/collections/CollectionLayoutClient';

export default function CollectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <CollectionLayoutClient id={params.id}>
      {children}
    </CollectionLayoutClient>
  );
}
