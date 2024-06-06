# Looking for additional maintainer

If you're interesting in helping maintain the package please shoot me a message. Thanks - Jake

# Strapi Provider Upload Azure Storage

Plugin enabling image uploading to azure storage from strapi.

[![NpmVersion](https://img.shields.io/npm/v/strapi-provider-upload-azure-storage.svg)](https://www.npmjs.com/package/strapi-provider-upload-azure-storage) [![NpmDownloads](https://img.shields.io/npm/dt/strapi-provider-upload-azure-storage.svg)](https://www.npmjs.com/package/strapi-provider-upload-azure-storage)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

- strapi@4.0.0+

### Installing

Inside your strapi project run the following

```sh
yarn add strapi-provider-upload-azure-storage

# or

npm install strapi-provider-upload-azure-storage
```

## Usage

To enable the provider, create or edit the file at `./config/plugins.js`.

This is an example `plugins.js` file for Azure storage:

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: "strapi-provider-upload-azure-storage",
      providerOptions: {
        authType: env("STORAGE_AUTH_TYPE", "default"),
        account: env("STORAGE_ACCOUNT"),
        accountKey: env("STORAGE_ACCOUNT_KEY"),//either account key or sas token is enough to make authentication 
        sasToken: env("STORAGE_ACCOUNT_SAS_TOKEN"),
        serviceBaseURL: env("STORAGE_URL"), // optional
        containerName: env("STORAGE_CONTAINER_NAME"),
        createContainerIfNotExist: env("STORAGE_CREATE_CONTAINER_IF_NOT_EXIST", 'false'), // optional
        publicAccessType: env("STORAGE_PUBLIC_ACCESS_TYPE"), // optional ('blob' | 'container')
        defaultPath: "assets",
        cdnBaseURL: env("STORAGE_CDN_URL"), // optional
        defaultCacheControl: env("STORAGE_CACHE_CONTROL"), // optional
        removeCN: env("REMOVE_CONTAINER_NAME"), // optional, if you want to remove container name from the URL 
      },
    },
  },
});

// For using azure identities, the correct authType is 'msi' or (provide it in the environment variable)

module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: "strapi-provider-upload-azure-storage",
      providerOptions: {
        authType: 'msi',
        account: env("STORAGE_ACCOUNT"),
        clientId: env("STORAGE_AZURE_CLIENT_ID"), // optional
        serviceBaseURL: env("STORAGE_URL"), // optional
        containerName: env("STORAGE_CONTAINER_NAME"),
        createContainerIfNotExist: env("STORAGE_CREATE_CONTAINER_IF_NOT_EXIST", 'false'), // optional
        publicAccessType: env("STORAGE_PUBLIC_ACCESS_TYPE"), // optional ('blob' | 'container')
        defaultPath: "assets",
        cdnBaseURL: env("STORAGE_CDN_URL"), // optional
        defaultCacheControl: env("STORAGE_CACHE_CONTROL"), // optional
        removeCN: env("REMOVE_CONTAINER_NAME"), // optional, if you want to remove container name from the URL 
      },
    },
  },
});

```

| Property                  | Required                                      | Description                                                                                   |
| ------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| authType                  | true                                          | Whether to use a SAS key ("default") or an identity ("msi")                                   |
| account                   | true                                          | Azure account name                                                                            |
| accountKey                | if 'authType 'default'                        | Secret access key                                                                             |
| clientId                  | false (consumed if 'authType 'msi')           | Azure Identity Client ID                                                                      |
| sasToken                  | false                                         | SAS Token, either accountKey or SASToken is required if 'authType is 'default'                |
| serviceBaseURL            | false                                         | Base service URL to be used, optional. Defaults to `https://${account}.blob.core.windows.net` |
| containerName             | true                                          | Container name                                                                                |
| createContainerIfNotExist | false                                         | Attempts to create the container if not existing. Must be one of 'true' or any string         |
| publicAccessType          | false (param for 'createContainerIfNotExist') | Sets the public access of a newly created container to one of 'blob' or 'container'           |
| defaultPath               | true                                          | The path to use when there is none being specified. Defaults to `assets`                      |
| cdnBaseURL                | false                                         | CDN base url                                                                                  |
| defaultCacheControl       | false                                         | Cache-Control header value for all uploaded files                                             |
| removeCN                  | false                                         | Set to true, to remove container name from azure URL                                          |


### Security Middleware Configuration

Due to the default settings in the Strapi Security Middleware you will need to modify the contentSecurityPolicy settings to properly see thumbnail previews in the Media Library. You should replace strapi::security string with the object bellow instead as explained in the middleware configuration documentation.

To allow the azure storage content to be displayed, edit the file at `./config/middlewares.js`.
You should replace the `strapi::security` string with the object below instead, see the [Middlewares configuration](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/middlewares.html) documentation for more details.

`./config/middlewares.js`

```js
module.exports = [
  // ...
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "dl.airtable.com", // Required for Strapi < 4.10.6, you can remove it otherwise
            "https://market-assets.strapi.io", // Required for Strapi >= 4.10.6, you can remove it otherwise
            /**
             * Note: If using a STORAGE_URL replace `https://${process.env.STORAGE_ACCOUNT}.blob.core.windows.net` w/ process.env.STORAGE_URL
             * If using a CDN URL make sure to include that url in the CSP headers process.env.STORAGE_CDN_URL
             */
            `https://${process.env.STORAGE_ACCOUNT}.blob.core.windows.net`,
          ],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            "dl.airtable.com", // Required for Strapi < 4.10.6, you can remove it otherwise
            /**
             * Note: If using a STORAGE_URL replace `https://${process.env.STORAGE_ACCOUNT}.blob.core.windows.net` w/ process.env.STORAGE_URL
             * If using a CDN URL make sure to include that url in the CSP headers process.env.STORAGE_CDN_URL
             */
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

`serviceBaseURL` is optional, it is useful when connecting to Azure Storage API compatible services, like the official emulator [Azurite](https://github.com/Azure/Azurite/). `serviceBaseURL` would then look like `http://localhost:10000/your-storage-account-key`.  
When `serviceBaseURL` is not provided, default `https://${account}.blob.core.windows.net` will be used.

`createContainerIfNotExist` can also be useful when working with [Azurite](https://github.com/Azure/Azurite/) as the tool provides very little by way of startup scripting.

`cdnBaseURL` is optional, it is useful when using CDN in front of your storage account. Images will be returned with the CDN URL instead of the storage account URL.

`defaultCacheControl` is optional. It is useful when you want to allow clients to use a cached version of the file. Azure storage will return this value in the [`Cache-Control` HTTP-header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control?retiredLocale=de) of the response. 

`removeCN` is optional. Some azure account configurations are such that they exclude 'container name' from the URL at which data is saved. It is by default set to false, if you want to remove container name from URL, set it to 'true'.

## Contributing

Contributions are welcome

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/jakeFeldman/strapi-provider-upload-azure-storage/releases).

## Authors

* **Jake Feldman** - *Initial work* - [jakeFeldman](https://github.com/jakeFeldman)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* strapi.io
* Azure
