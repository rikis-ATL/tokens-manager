'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

interface DeletableEdgeData {
  onDelete?: (id: string) => void;
}

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as unknown as DeletableEdgeData | undefined;

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan opacity-0 hover:opacity-100 transition-opacity"
        >
          <button
            title="Remove connection"
            onClick={() => edgeData?.onDelete?.(id)}
            className="w-4 h-4 rounded-full bg-white border border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500 flex items-center justify-center shadow-sm leading-none text-[11px]"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
