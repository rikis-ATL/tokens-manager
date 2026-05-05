'use client';

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

export interface GroupBoundaryData {
  width: number;
  height: number;
}

function GroupBoundaryNodeComponent({ data }: NodeProps) {
  const { width, height } = data as unknown as GroupBoundaryData;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: '2px dashed #e2e8f0',
        borderRadius: '12px',
        backgroundColor: 'rgba(226, 232, 240, 0.05)',
        pointerEvents: 'none',
      }}
    />
  );
}

export const GroupBoundaryNode = memo(GroupBoundaryNodeComponent);
