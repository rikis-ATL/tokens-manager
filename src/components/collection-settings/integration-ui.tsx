'use client';

export type IntegrationDisplayStatus =
  | { kind: 'incomplete' }
  | { kind: 'unverified' }
  | { kind: 'testing' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

export function figmaCredentialsFingerprint(token: string, fileId: string): string {
  return `${token.trim()}|${fileId.trim()}`;
}

/** Pill label only — full messages render in `IntegrationStatusDetail` */
export function IntegrationStatusBadge({ status }: { status: IntegrationDisplayStatus }) {
  if (status.kind === 'incomplete') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-muted" aria-hidden />
        Not configured
      </span>
    );
  }
  if (status.kind === 'unverified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-2 py-1 rounded-full border border-warning">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden />
        Not verified
      </span>
    );
  }
  if (status.kind === 'testing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary">
        <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden />
        Testing…
      </span>
    );
  }
  if (status.kind === 'ok') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1 rounded-full border border-success">
        <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" aria-hidden />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full border border-destructive">
      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" aria-hidden />
      Failed
    </span>
  );
}

export function IntegrationStatusDetail({ status }: { status: IntegrationDisplayStatus }) {
  if (status.kind === 'ok' && status.message.trim()) {
    return (
      <p className="text-xs text-success bg-success/10 border border-success rounded-md px-3 py-2 leading-relaxed">
        {status.message}
      </p>
    );
  }
  if (status.kind === 'error' && status.message.trim()) {
    return (
      <p className="text-xs text-destructive bg-destructive/10 border border-destructive rounded-md px-3 py-2 leading-relaxed whitespace-pre-wrap">
        {status.message}
      </p>
    );
  }
  return null;
}
