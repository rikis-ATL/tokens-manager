export type DatabaseProvider =
  | 'local-mongodb'
  | 'mongodb-atlas'
  | 'custom-mongodb'
  | 'supabase'
  | 'neon'
  | 'planetscale'
  | 'turso';

export interface DatabaseProviderInfo {
  id: DatabaseProvider;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  fields: DatabaseFieldDef[];
}

export interface DatabaseFieldDef {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number';
  placeholder: string;
  required: boolean;
  helpText?: string;
}

export interface DatabaseConfig {
  provider: DatabaseProvider;
  connectionUri: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  /** Provider-specific options (e.g. Supabase project ref, API key) */
  options?: Record<string, string>;
}

export interface DatabaseConnectionStatus {
  connected: boolean;
  provider: DatabaseProvider;
  host: string;
  database: string;
  latencyMs: number;
  error?: string;
}

export const MONGODB_PROVIDERS: DatabaseProvider[] = [
  'local-mongodb',
  'mongodb-atlas',
  'custom-mongodb',
];

export const DATABASE_PROVIDERS: DatabaseProviderInfo[] = [
  {
    id: 'local-mongodb',
    name: 'Local MongoDB',
    description: 'MongoDB running on your machine (default)',
    icon: '🗄️',
    available: true,
    fields: [
      {
        key: 'host',
        label: 'Host',
        type: 'text',
        placeholder: 'localhost',
        required: true,
      },
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        placeholder: '27017',
        required: true,
      },
      {
        key: 'database',
        label: 'Database',
        type: 'text',
        placeholder: 'atui-tokens',
        required: true,
      },
    ],
  },
  {
    id: 'mongodb-atlas',
    name: 'MongoDB Atlas',
    description: 'Fully managed cloud MongoDB by MongoDB Inc.',
    icon: '🌿',
    available: true,
    fields: [
      {
        key: 'connectionUri',
        label: 'Connection String',
        type: 'password',
        placeholder: 'mongodb+srv://user:pass@cluster.mongodb.net/dbname',
        required: true,
        helpText: 'Find this in Atlas → Database → Connect → Drivers',
      },
    ],
  },
  {
    id: 'custom-mongodb',
    name: 'Custom MongoDB',
    description: 'Any MongoDB-compatible host (DigitalOcean, AWS DocumentDB, etc.)',
    icon: '🔗',
    available: true,
    fields: [
      {
        key: 'connectionUri',
        label: 'Connection URI',
        type: 'password',
        placeholder: 'mongodb://user:pass@host:port/database',
        required: true,
        helpText: 'Full MongoDB connection string including credentials',
      },
    ],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Open-source Firebase alternative (PostgreSQL)',
    icon: '⚡',
    available: true,
    fields: [
      {
        key: 'supabaseUrl',
        label: 'Project URL',
        type: 'text',
        placeholder: 'https://your-project.supabase.co',
        required: true,
        helpText: 'Project Settings → API → Project URL',
      },
      {
        key: 'supabaseKey',
        label: 'Service Role Key',
        type: 'password',
        placeholder: 'eyJhbGciOiJIUzI1NiIs...',
        required: true,
        helpText: 'Project Settings → API → service_role (secret). Required for server-side access.',
      },
    ],
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Serverless PostgreSQL with branching',
    icon: '🟢',
    available: false,
    fields: [
      {
        key: 'connectionUri',
        label: 'Connection String',
        type: 'password',
        placeholder: 'postgresql://user:pass@ep-xxx.region.neon.tech/dbname',
        required: true,
      },
    ],
  },
  {
    id: 'planetscale',
    name: 'PlanetScale',
    description: 'Serverless MySQL with branching & zero-downtime migrations',
    icon: '🪐',
    available: false,
    fields: [
      {
        key: 'connectionUri',
        label: 'Connection String',
        type: 'password',
        placeholder: 'mysql://user:pass@host/database?ssl={"rejectUnauthorized":true}',
        required: true,
      },
    ],
  },
  {
    id: 'turso',
    name: 'Turso',
    description: 'Edge-hosted SQLite (libSQL) with global replication',
    icon: '🐢',
    available: false,
    fields: [
      {
        key: 'connectionUri',
        label: 'Database URL',
        type: 'password',
        placeholder: 'libsql://db-name-org.turso.io',
        required: true,
      },
    ],
  },
];
