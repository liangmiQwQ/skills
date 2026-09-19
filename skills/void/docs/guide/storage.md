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

The `storage` object is a full `R2Bucket`. Every method from the [Cloudflare R2 API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) is available directly, with no wrapper layer.

## Serving Files

A common pattern is serving uploaded files from an API route:

```ts
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

## How It Works

`storage` resolves the `env.STORAGE` binding when you use it. It exposes the R2 API directly, so methods and options work as described in Cloudflare's documentation.

The `createStorage()` factory exists for testing and for frameworks that manage their own routing. It accepts an `R2Bucket` and returns it directly.
