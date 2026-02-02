# Strapi Provider Upload Azure Storage

Plugin enabling image uploading to Azure Blob Storage from Strapi.

[![NpmVersion](https://img.shields.io/npm/v/strapi-provider-upload-azure-storage.svg)](https://www.npmjs.com/package/strapi-provider-upload-azure-storage) [![NpmDownloads](https://img.shields.io/npm/dt/strapi-provider-upload-azure-storage.svg)](https://www.npmjs.com/package/strapi-provider-upload-azure-storage)

## Requirements

- Node.js >= 18.0.0
- Strapi v4 or v5

## Installation

```sh
yarn add strapi-provider-upload-azure-storage

# or

npm install strapi-provider-upload-azure-storage
```

## Configuration

Create or edit the file at `./config/plugins.js` (or `./config/plugins.ts` for TypeScript).

### Account Key Authentication

The most common authentication method using your storage account key:

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-azure-storage',
      providerOptions: {
        authType: 'accountKey',
        account: env('STORAGE_ACCOUNT'),
        accountKey: env('STORAGE_ACCOUNT_KEY'),
        containerName: env('STORAGE_CONTAINER_NAME'),
        defaultPath: 'assets',
        cdnBaseURL: env('STORAGE_CDN_URL'), // optional
        cacheControl: env('STORAGE_CACHE_CONTROL'), // optional
      },
    },
  },
});
```

### SAS Token Authentication

Use a pre-generated SAS token for limited access:

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-azure-storage',
      providerOptions: {
        authType: 'sasToken',
        account: env('STORAGE_ACCOUNT'),
        sasToken: env('STORAGE_SAS_TOKEN'), // e.g., '?sv=2022-11-02&ss=b&srt=sco...'
        containerName: env('STORAGE_CONTAINER_NAME'),
        defaultPath: 'assets',
      },
    },
  },
});
```

> **Note:** SAS token authentication does not support generating signed URLs for private files. Use `accountKey` or `msi` authentication if you need `getSignedUrl()` functionality.

### Managed Identity Authentication (MSI)

For Azure-hosted applications using managed identities:

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-azure-storage',
      providerOptions: {
        authType: 'msi',
        account: env('STORAGE_ACCOUNT'),
        clientId: env('STORAGE_AZURE_CLIENT_ID'), // optional, for user-assigned identity
        containerName: env('STORAGE_CONTAINER_NAME'),
        defaultPath: 'assets',
        isPrivate: true, // enable signed URLs for private blobs
        signedUrlExpiry: 60, // URL expiry in minutes (default: 60)
      },
    },
  },
});
```

> **Note:** MSI authentication requires the `Storage Blob Data Contributor` RBAC role.

### Private Files with Signed URLs

To serve files through signed URLs (for private containers), enable the `isPrivate` option:

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-azure-storage',
      providerOptions: {
        authType: 'accountKey',
        account: env('STORAGE_ACCOUNT'),
        accountKey: env('STORAGE_ACCOUNT_KEY'),
        containerName: env('STORAGE_CONTAINER_NAME'),
        defaultPath: 'assets',
        isPrivate: true,
        signedUrlExpiry: 30, // minutes
      },
    },
  },
});
```

When `isPrivate: true`, Strapi will call `getSignedUrl()` to generate time-limited access URLs for your files.

## Configuration Options

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `authType` | `'accountKey'` \| `'sasToken'` \| `'msi'` | Yes | - | Authentication method |
| `account` | `string` | Yes | - | Azure storage account name |
| `accountKey` | `string` | If `authType: 'accountKey'` | - | Storage account access key |
| `sasToken` | `string` | If `authType: 'sasToken'` | - | SAS token (with or without leading `?`) |
| `clientId` | `string` | No | - | Client ID for user-assigned managed identity |
| `containerName` | `string` | Yes | - | Blob container name (use `$root` for root container) |
| `defaultPath` | `string` | No | `''` | Default path prefix for uploaded files |
| `serviceBaseURL` | `string` | No | `https://{account}.blob.core.windows.net` | Custom service URL (for emulators like Azurite) |
| `cdnBaseURL` | `string` | No | - | CDN URL to replace storage URL in file URLs |
| `cacheControl` | `string` | No | - | Cache-Control header for uploaded files |
| `createContainerIfNotExist` | `boolean` | No | `false` | Create container if it doesn't exist |
| `publicAccessType` | `'blob'` \| `'container'` | No | - | Public access level for auto-created containers |
| `removeContainerFromUrl` | `boolean` | No | `false` | Remove container name from returned URLs |
| `uploadOptions.bufferSize` | `number` | No | `4194304` | Buffer size for stream uploads (bytes) |
| `uploadOptions.maxConcurrency` | `number` | No | `20` | Max concurrent upload operations |
| `isPrivate` | `boolean` | No | `false` | Enable signed URL generation for private files |
| `signedUrlExpiry` | `number` | No | `60` | Signed URL expiry time in minutes |

## Security Middleware Configuration

To display thumbnails in the Strapi Media Library, update the Content Security Policy in `./config/middlewares.js`:

```js
module.exports = [
  // ...
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https://market-assets.strapi.io',
            `https://${process.env.STORAGE_ACCOUNT}.blob.core.windows.net`,
            // Add your CDN URL if using one:
            // process.env.STORAGE_CDN_URL,
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            `https://${process.env.STORAGE_ACCOUNT}.blob.core.windows.net`,
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // ...
];
```

## Migration Guide: v3.x to v4.0.0

### Breaking Changes

v4.0.0 includes several breaking changes to improve consistency and type safety:

#### 1. Authentication Type Values

The `authType` value `'default'` has been split into explicit types:

```js
// Before (v3.x)
authType: 'default',
accountKey: '...',     // or sasToken: '...'

// After (v4.0.0) - Account Key
authType: 'accountKey',
accountKey: '...',

// After (v4.0.0) - SAS Token
authType: 'sasToken',
sasToken: '...',
```

#### 2. Boolean Configuration Values

Boolean options now use actual booleans instead of strings:

```js
// Before (v3.x)
createContainerIfNotExist: 'true',

// After (v4.0.0)
createContainerIfNotExist: true,
```

#### 3. Renamed Options

| v3.x | v4.0.0 |
|------|--------|
| `removeCN` | `removeContainerFromUrl` |
| `defaultCacheControl` | `cacheControl` |
| `uploadOptions.maxBuffers` | `uploadOptions.maxConcurrency` |

#### 4. Node.js Requirement

v4.0.0 requires Node.js 18.0.0 or higher.

### Migration Example

**Before (v3.x):**

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-azure-storage',
      providerOptions: {
        authType: 'default',
        account: env('STORAGE_ACCOUNT'),
        accountKey: env('STORAGE_ACCOUNT_KEY'),
        containerName: env('STORAGE_CONTAINER_NAME'),
        createContainerIfNotExist: 'true',
        defaultPath: 'assets',
        defaultCacheControl: 'max-age=31536000',
        removeCN: 'true',
      },
    },
  },
});
```

**After (v4.0.0):**

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-azure-storage',
      providerOptions: {
        authType: 'accountKey',
        account: env('STORAGE_ACCOUNT'),
        accountKey: env('STORAGE_ACCOUNT_KEY'),
        containerName: env('STORAGE_CONTAINER_NAME'),
        createContainerIfNotExist: true,
        defaultPath: 'assets',
        cacheControl: 'max-age=31536000',
        removeContainerFromUrl: true,
      },
    },
  },
});
```

### New Features in v4.0.0

- **`isPrivate` option**: Mark your storage as private to enable signed URL generation
- **`getSignedUrl()` method**: Generate time-limited access URLs for private blobs
- **`signedUrlExpiry` option**: Configure how long signed URLs remain valid
- **Improved TypeScript types**: Better IDE support with declaration maps

## Development

### Local Development with Azurite

For local development, you can use [Azurite](https://github.com/Azure/Azurite/), the Azure Storage emulator:

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-azure-storage',
      providerOptions: {
        authType: 'accountKey',
        account: 'devstoreaccount1',
        accountKey: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
        serviceBaseURL: 'http://127.0.0.1:10000/devstoreaccount1',
        containerName: 'strapi',
        createContainerIfNotExist: true,
        defaultPath: 'assets',
      },
    },
  },
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/jakeFeldman/strapi-provider-upload-azure-storage/releases).

## Authors

- **Jake Feldman** - *Initial work* - [jakeFeldman](https://github.com/jakeFeldman)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- [Strapi](https://strapi.io)
- [Azure Blob Storage](https://azure.microsoft.com/en-us/services/storage/blobs/)
