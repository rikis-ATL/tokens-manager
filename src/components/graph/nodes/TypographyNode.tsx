'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TextFont } from '@carbon/icons-react';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, NativeSelect, TextInput,
  PreviewSection, HANDLE_STRING, HANDLE_OUT,
} from './nodeShared';
import type { ComposableNodeData, TypographyConfig, FontStyle } from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';

const FONT_STYLES: { value: FontStyle; label: string }[] = [
  { value: 'normal',  label: 'Normal' },
  { value: 'italic',  label: 'Italic' },
  { value: 'oblique', label: 'Oblique' },
];

/** Resolve: wired input takes precedence, falls back to config field. */
function useField(
  inputVal: unknown,
  configVal: string,
): { value: string; wired: boolean } {
  const wiredStr = inputVal != null && String(inputVal).trim() !== '' ? String(inputVal) : null;
  return { value: wiredStr ?? configVal, wired: wiredStr !== null };
}

function WiredIndicator() {
  return (
    <span className="text-[9px] bg-primary/15 text-primary border border-primary rounded px-1 py-0.5 flex-shrink-0">
      wired
    </span>
  );
}

function TypographyNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const cfg = config as TypographyConfig;

  const update = (partial: Partial<TypographyConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const family  = useField(inputs['fontFamily'],    cfg.fontFamily);
  const size    = useField(inputs['fontSize'],       cfg.fontSize);
  const lh      = useField(inputs['lineHeight'],     cfg.lineHeight);
  const weight  = useField(inputs['fontWeight'],     cfg.fontWeight);
  const ls      = useField(inputs['letterSpacing'],  cfg.letterSpacing);

  const shorthand = (outputs['shorthand'] as string | null) ?? null;
  const json      = (outputs['json']      as string | null) ?? null;

  // Preview text style — clamp to safe values for the browser
  const previewStyle: React.CSSProperties = shorthand
    ? { font: shorthand, letterSpacing: cfg.letterSpacing || undefined }
    : {};

  return (
    <NodeWrapper borderColor="border-info/40" width={268}>
      <NodeHeader
        icon={<TextFont size={12} className="text-info" />}
        title="Typography"
        badge="composite"
        headerClass="bg-info/10 border-info/30 text-info"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">
        {/* Font Weight */}
        <Row
          label="Weight"
          handle={<RowHandle id="fontWeight" className={HANDLE_STRING} title="fontWeight — e.g. 400, bold (wire a Token or Constant)" />}
        >
          {weight.wired ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-foreground truncate">{weight.value}</span>
              <WiredIndicator />
            </div>
          ) : (
            <TextInput value={cfg.fontWeight} onChange={v => update({ fontWeight: v })} placeholder="400" {...graphLock} />
          )}
        </Row>

        {/* Font Size */}
        <Row
          label="Size"
          handle={<RowHandle id="fontSize" className={HANDLE_STRING} title="fontSize — e.g. 1rem, 16px (wire a Token or Constant)" />}
        >
          {size.wired ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-foreground truncate">{size.value}</span>
              <WiredIndicator />
            </div>
          ) : (
            <TextInput value={cfg.fontSize} onChange={v => update({ fontSize: v })} placeholder="1rem" {...graphLock} />
          )}
        </Row>

        {/* Line Height */}
        <Row
          label="Line Height"
          handle={<RowHandle id="lineHeight" className={HANDLE_STRING} title="lineHeight — e.g. 1.5, 24px (wire a Token or Constant)" />}
        >
          {lh.wired ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-foreground truncate">{lh.value}</span>
              <WiredIndicator />
            </div>
          ) : (
            <TextInput value={cfg.lineHeight} onChange={v => update({ lineHeight: v })} placeholder="1.5" {...graphLock} />
          )}
        </Row>

        {/* Font Family */}
        <Row
          label="Family"
          handle={<RowHandle id="fontFamily" className={HANDLE_STRING} title="fontFamily — e.g. Helvetica, Arial, sans-serif (wire a Token or Constant)" />}
        >
          {family.wired ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-foreground truncate">{family.value}</span>
              <WiredIndicator />
            </div>
          ) : (
            <TextInput value={cfg.fontFamily} onChange={v => update({ fontFamily: v })} placeholder="Helvetica, sans-serif" {...graphLock} />
          )}
        </Row>

        {/* Letter Spacing (optional) */}
        <Row
          label="Tracking"
          handle={<RowHandle id="letterSpacing" className={HANDLE_STRING} title="letterSpacing — e.g. 0px, 0.05em (optional)" />}
        >
          {ls.wired ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-foreground truncate">{ls.value}</span>
              <WiredIndicator />
            </div>
          ) : (
            <TextInput value={cfg.letterSpacing} onChange={v => update({ letterSpacing: v })} placeholder="0px (optional)" {...graphLock} />
          )}
        </Row>

        {/* Font Style */}
        <Row label="Style">
          <NativeSelect
            value={cfg.fontStyle}
            onChange={v => update({ fontStyle: v as FontStyle })}
            options={FONT_STYLES}
          />
        </Row>

        {/* ── Preview ── */}
        {shorthand && (
          <PreviewSection>
            {/* Live preview text */}
            <div
              className="rounded bg-background border border-border px-2 py-1.5 mb-1.5 overflow-hidden"
              style={{ maxHeight: 48 }}
            >
              <p
                className="text-foreground truncate"
                style={previewStyle}
                title={shorthand}
              >
                Aa — The quick brown fox
              </p>
            </div>

            {/* Shorthand output */}
            <Row
              label="Shorthand"
              handle={
                <RowHandle
                  id="value"
                  type="source"
                  side="right"
                  className={HANDLE_OUT}
                  title="value — CSS font shorthand string"
                />
              }
            >
              <span className="font-mono text-[9px] text-info truncate block" title={shorthand}>
                {shorthand}
              </span>
            </Row>

            {/* JSON output (for DTCG composite token) */}
            {json && (
              <Row
                label="JSON"
                handle={
                  <RowHandle
                    id="json"
                    type="source"
                    side="right"
                    className={HANDLE_STRING}
                    title="json — DTCG composite token object string"
                  />
                }
              >
                <span className="font-mono text-[9px] text-muted-foreground truncate block" title={json}>
                  {'{…}'}
                </span>
              </Row>
            )}

            {/* Individual passthrough outputs */}
            <div className="mt-1.5 pt-1.5 border-t border-border space-y-1">
              {([
                ['fontFamily',    'Family'],
                ['fontSize',      'Size'],
                ['lineHeight',    'Line H'],
                ['fontWeight',    'Weight'],
                ['letterSpacing', 'Tracking'],
              ] as const).map(([id, label]) => (
                <Row
                  key={id}
                  label={<span className="text-muted-foreground">{label}</span>}
                  handle={
                    <RowHandle
                      id={id}
                      type="source"
                      side="right"
                      className={HANDLE_STRING}
                      title={`${id} passthrough`}
                    />
                  }
                >
                  <span className="font-mono text-[9px] text-muted-foreground truncate block">
                    {String(outputs[id] ?? '—')}
                  </span>
                </Row>
              ))}
            </div>
          </PreviewSection>
        )}

        {/* Fallback output handle when not yet evaluated */}
        {!shorthand && (
          <Handle type="source" id="value" position={Position.Right} className={HANDLE_OUT} />
        )}
      </div>
    </NodeWrapper>
  );
}

export const TypographyNode = memo(TypographyNodeComponent);
