'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
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
  sourceHandleId,
  targetHandleId,
  style,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as unknown as DeletableEdgeData | undefined;

  // Build a readable port label: "series → base"
  const portLabel =
    sourceHandleId && targetHandleId
      ? `${sourceHandleId} → ${targetHandleId}`
      : sourceHandleId ?? targetHandleId ?? null;

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
          className="nodrag nopan group/edge flex flex-col items-center gap-1"
        >
          {/* Port label — visible on edge hover */}
          {portLabel && (
            <span className="opacity-0 group-hover/edge:opacity-100 transition-opacity bg-white border border-gray-200 text-[9px] font-mono text-gray-500 rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap pointer-events-none select-none">
              {portLabel}
            </span>
          )}

          {/* Delete button */}
          <button
            title="Remove connection"
            onClick={() => edgeData?.onDelete?.(id)}
            className="opacity-0 group-hover/edge:opacity-100 transition-opacity w-4 h-4 rounded-full bg-white border border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500 flex items-center justify-center shadow-sm leading-none text-[11px]"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
