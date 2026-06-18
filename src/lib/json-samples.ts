export interface JsonSample {
  id: string;
  label: string;
  json: string;
  code?: string;
}

export const JSON_SAMPLES: JsonSample[] = [
  {
    id: 'default',
    label: 'User & posts',
    json: `{
  "user": {
    "name": "John Doe",
    "age": 28,
    "email": "john@example.com"
  },
  "posts": [
    { "id": 1, "title": "Hello World" },
    { "id": 2, "title": "Learning JSON" }
  ],
  "settings": {
    "theme": "dark",
    "notifications": true
  }
}`,
    code: `const names = data.posts.map(p => p.title);
Dump(names);`,
  },
  {
    id: 'api-list',
    label: 'API list response',
    json: `{
  "data": [
    { "id": "usr_1", "email": "a@example.com", "role": "admin" },
    { "id": "usr_2", "email": "b@example.com", "role": "member" }
  ],
  "meta": { "page": 1, "total": 2 }
}`,
    code: 'Dump(Queryable.From(data.data).Where(u => u.role === "admin").ToArray());',
  },
  {
    id: 'config',
    label: 'App config',
    json: `{
  "app": {
    "name": "JsonExplorer",
    "version": "1.0.0",
    "features": { "liveRun": true, "share": true }
  },
  "database": {
    "host": "localhost",
    "port": 5432
  }
}`,
    code: 'Dump(data.app.features);',
  },
  {
    id: 'array',
    label: 'Number array',
    json: JSON.stringify(
      Array.from({ length: 20 }, (_, i) => ({ id: i + 1, value: (i + 1) * 10 })),
      null,
      2
    ),
    code: 'Dump(Queryable.From(data).Where(x => x.value > 100).Select(x => x.id).ToArray());',
  },
];
