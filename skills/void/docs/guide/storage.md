---
outline: deep
---

# Object Storage

Store files in [Cloudflare R2](https://developers.cloudflare.com/r2/) with `storage` from `void/storage`. It gives you the typed R2 API for uploads, downloads, and metadata.

## Basic Operations

```ts
import { storage } from 'void/storage';

// Upload
await storage.put('uploads/photo.jpg', file, {
  httpMetadata: { contentType: 'image/jpeg' },
});

// Download
const object = await storage.get('uploads/photo.jpg');
if (object) {
  const data = await object.arrayBuffer();
}

// Delete
await storage.delete('uploads/photo.jpg');

// List
const listed = await storage.list({ prefix: 'uploads/' });
for (const obj of listed.objects) {
  console.log(obj.key, obj.size);
}

// Head (metadata only)
const head = await storage.head('uploads/photo.jpg');
```

`storage` supports the full [R2Bucket API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

## Serving Files

A common pattern is serving uploaded files from an API route:

```ts
import { defineHandler } from 'void';
import { storage } from 'void/storage';

export const GET = defineHandler(async (c) => {
  const key = c.req.param('key');
  const object = await storage.get(key);

  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers });
});
```

## Custom bindings

Use `createStorage(bucket)` with your own R2 binding, or in tests:

```ts
import { createStorage } from 'void/storage';

const storage = createStorage(env.MY_BUCKET);
```
