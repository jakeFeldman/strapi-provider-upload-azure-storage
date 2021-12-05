# Strapi Provider Upload Azure Storage

Plugin enabling image uploading to azure storage from strapi.

[![NpmVersion](https://img.shields.io/npm/v/strapi-provider-upload-azure-storage.svg)](https://www.npmjs.com/package/strapi-provider-upload-azure-storage) [![NpmDownloads](https://img.shields.io/npm/dt/strapi-provider-upload-azure-storage.svg)](https://www.npmjs.com/package/strapi-provider-upload-azure-storage)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

* Node 10+
* npm 6+
* strapi@3.0.0-beta.16+

### Installing

Inside your strapi project run the following

```sh
yarn add strapi-provider-upload-azure-storage

# or

npm install strapi-provider-upload-azure-storage
```

## Usage


### Strapi version >= 4.0.0

With a stable release of Strapi 4.0.0, the configuration was moved to a JavaScript file. Official documentation [here](https://strapi.io/documentation/developer-docs/latest/development/plugins/upload.html#using-a-provider).

To enable the provider, create or edit the file at ```./config/plugins.js```.

This is an example plugins.js file for Azure storage:
```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-azure-storage',
      providerOptions: {
        account: env('STORAGE_ACCOUNT'),
        accountKey: env('STORAGE_ACCOUNT_KEY'),
        serviceBaseURL: env('STORAGE_URL'),
        containerName: env('STORAGE_CONTAINER_NAME'),
        cdnBaseURL: env('STORAGE_CDN_URL'),
        defaultPath: 'assets',
        maxConcurrent: 10
      }
    }
  }
});
```

### Strapi version >= 3.0.0 & < 4.0.0

With a stable release of Strapi 3.0.0, the configuration was moved to a JavaScript file. Official documentation.

To enable the provider, create or edit the file at ```./config/plugins.js```.

This is an example plugins.js file for Azure storage:
```js
module.exports = ({ env }) => ({
  upload: {
    provider: 'azure-storage',
    providerOptions: {
      account: env('STORAGE_ACCOUNT'),
      accountKey: env('STORAGE_ACCOUNT_KEY'),
      serviceBaseURL: env('STORAGE_URL'),
      containerName: env('STORAGE_CONTAINER_NAME'),
      cdnBaseURL: env('STORAGE_CDN_URL'),
      defaultPath: 'assets',
      maxConcurrent: 10
    }
  }
});
```

`serviceBaseURL` is optional, it is useful when connecting to Azure Storage API compatible services, like the official emulator [Azurite](https://github.com/Azure/Azurite/). `serviceBaseURL` would then look like `http://localhost:10000/your-storage-account-key`.  
When `serviceBaseURL` is not provided, default `https://${account}.blob.core.windows.net` will be used.

`cdnBaseURL` is optional, it is useful when using CDN in front of your storage account. Images will be returned with the CDN URL instead of the storage account URL.

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
