# Strapi Provider Upload Azure Storage

Plugin enabling image uploading to azure storage from strapi.

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

### Strapi version >= beta20.x

Coming with Media Library the settings of the upload plugin were moved to file. Official documentation [here](https://strapi.io/documentation/3.0.0-beta.x/plugins/upload.html#using-a-provider).

To enable the provider, create or edit the file at ```./extensions/upload/config/settings.json```

This is an example settings.json file for Azure storage:
```json
  {
    "provider": "azure-storage",
    "providerOptions": {
      "account": "your-storage-account-name",
      "accountKey": "your-storage-account-key",
      "containerName": "your-container-name",
      "defaultPath": "your-default-path",
      "maxConcurrent": 10
    }
  }
```

### Strapi version < beta20.x
After installing in a strapi project, strapi will recognize the provider inside the media settings.

After selecting the "azure" provider, the required fields are needed.

Account name - Storage account name

Secret Access Key - Azure storage account secret access key.

Container Name - The name of the conatiner in the Azure storage account.

Default Path - The default folder inside the container in which your assets will be stored. i.e. "/static"

Concurrent Uploads - The maximum concurrent buffers. Azure's `uploadStreamToBlockBlob` requires a max number of concurrent uploads. i.e. 20.

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
