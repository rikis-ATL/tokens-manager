export type Role = 'Admin' | 'Editor' | 'Viewer' | 'Demo';

export const Action = {
  Read:             'Read',
  Write:            'Write',
  WritePlayground:  'WritePlayground',
  CreateCollection: 'CreateCollection',
  DeleteCollection: 'DeleteCollection',
  ManageUsers:      'ManageUsers',
  PushGithub:       'PushGithub',
  PushFigma:        'PushFigma',
  ManageVersions:   'ManageVersions',
  PublishNpm:       'PublishNpm',
} as const;

export type ActionType = typeof Action[keyof typeof Action];

const PERMISSIONS: Record<Role, Set<ActionType>> = {
  Admin:  new Set(Object.values(Action)),
  Editor: new Set([
    Action.Read,
    Action.Write,
    Action.CreateCollection,
    Action.PushGithub,
    Action.PushFigma,
    Action.ManageVersions,
    Action.PublishNpm,
  ]),
  Viewer: new Set([Action.Read]),
  Demo:   new Set([Action.Read, Action.WritePlayground]),
};

export function canPerform(role: Role, action: ActionType): boolean {
  return PERMISSIONS[role]?.has(action) ?? false;
}
