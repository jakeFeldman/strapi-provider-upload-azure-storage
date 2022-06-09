const {
    Aborter,
    BlobURL,
    BlockBlobURL,
    ContainerURL,
    ServiceURL,
    StorageURL,
    SharedKeyCredential,
    uploadStreamToBlockBlob,
} = require('@azure/storage-blob');
const BufferStream = require('./BufferStream');
const sharp = require('sharp');

const trimParam = str => (typeof str === 'string' ? str.trim() : undefined);

const isOriginalFile = file => file.hasOwnProperty('alternativeText');

const convertToWebp = (file, webpOptions) => {
    return sharp(file.buffer)
        .webp(webpOptions)
        .toBuffer()
        .then((buffer) => Object.assign({}, file, { ext: '.webp', buffer }));
};

const convertToAvif = (file, avifOptions) => {
    return sharp(file.buffer)
        .avif(avifOptions)
        .toBuffer()
        .then((buffer) => Object.assign({}, file, { ext: '.avif', buffer }));
};

module.exports = {
    provider: 'azure',
    auth: {
        account: {
            label: 'Account name',
            type: 'text',
        },
        accountKey: {
            label: 'Secret Access Key',
            type: 'text',
        },
        serviceBaseURL: {
            label: 'Base service URL to be used, optional. Defaults to https://${account}.blob.core.windows.net',
            type: 'text',
        },
        containerName: {
            label: 'Container name',
            type: 'text',
        },
        defaultPath: {
            label: 'The path to use when there is none being specified',
            type: 'text',
        },
        maxConcurent: {
            label: 'The maximum concurrent uploads to Azure',
            type: 'number'
        },
        cdnBaseURL: {
            label: 'Expose public CDN URL instead of service URL',
            type: 'text',
        },
    },
    init: config => {
        const account = trimParam(config.account);
        const accountKey = trimParam(config.accountKey);
        const sharedKeyCredential = new SharedKeyCredential(account, accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);
        const serviceBaseURL = trimParam(config.serviceBaseURL) || `https://${account}.blob.core.windows.net`;
        const serviceURL = new ServiceURL(serviceBaseURL, pipeline);
        const containerURL = ContainerURL.fromServiceURL(serviceURL, config.containerName);
        const cdnBaseURL = trimParam(config.cdnBaseURL);
        const serviceUrlToCdnUrl = url => cdnBaseURL
            ? url.replace(serviceBaseURL, cdnBaseURL)
            : url;

        return {
            upload: file => new Promise(async (resolve, reject) => {
                const uploads = [];

                const getBlockBlobUrl = fileToUpload => {
                    const fileName = fileToUpload.hash + fileToUpload.ext;
                    const containerWithPath = Object.assign({}, containerURL);
                    containerWithPath.url += `/${fileToUpload.path || config.defaultPath}`;

                    const blobURL = BlobURL.fromContainerURL(containerWithPath, fileName);
                    return BlockBlobURL.fromBlobURL(blobURL);
                };

                const uploadFile = (fileToUpload, blockBlobURL) => {
                    return uploadStreamToBlockBlob(
                        Aborter.timeout(60 * 60 * 1000),
                        new BufferStream(fileToUpload.buffer),
                        blockBlobURL,
                        4 * 1024 * 1024,
                        ~~config.maxConcurent || 20,
                        {
                            blobHTTPHeaders: {
                                blobContentType: fileToUpload.mime,
                            },
                        }
                    );
                };

                const uploadAdditionalFile = (additionalFile, format) => {
                    const blockBlobURL = getBlockBlobUrl(additionalFile);
                    const url = serviceUrlToCdnUrl(blockBlobURL.url);
                    const propertyName = `${format}Url`;
                    if (isOriginalFile(file)) {
                        file.provider_metadata = Object.assign(
                            {},
                            file.provider_metadata,
                            { [propertyName]: url }
                        );
                    }
                    else {
                        file[propertyName] = serviceUrlToCdnUrl(url);
                    }
                    return uploadFile(additionalFile, blockBlobURL);
                };

                const fileBlockBlobUrl = getBlockBlobUrl(file);
                file.url = serviceUrlToCdnUrl(fileBlockBlobUrl.url);
                uploads.push(uploadFile(file, fileBlockBlobUrl));

                if (config.webp && (file.mime === 'image/jpeg' || file.mime === 'image/png')) {
                    uploads.push(convertToWebp(file, config.webpOptions)
                        .then((webpFile) => uploadAdditionalFile(webpFile, 'webp')));
                }

                if (config.avif && (file.mime === 'image/jpeg' || file.mime === 'image/png')) {
                    uploads.push(convertToAvif(file, config.avifOptions)
                        .then((avifFile) => uploadAdditionalFile(avifFile, 'avif')));
                }

                return Promise.all(uploads).then(resolve, reject);
            }),
            delete: file => new Promise((resolve, reject) => {
                const deleteFile = fileUrl => {
                    let _temp = cdnBaseURL ? fileUrl.replace(cdnBaseURL, serviceBaseURL) : fileUrl;
                    _temp = _temp.replace(containerURL.url, '');
                    const pathParts = _temp.split('/').filter(x => x.length > 0);
                    const fileName = pathParts.splice(pathParts.length - 1, 1);
                    const containerWithPath = Object.assign({}, containerURL);
                    containerWithPath.url += '/' + pathParts.join('/');

                    const blobURL = BlobURL.fromContainerURL(containerWithPath, fileName);
                    const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);
                    return blockBlobURL.delete().catch((res) => {
                        if (res.statusCode === '404') {
                            return Promise.resolve();
                        }
                    });
                };

                const deletions = [deleteFile(file.url)];

                if (file.provider_metadata && file.provider_metadata.webpUrl) {
                    deletions.push(deleteFile(file.provider_metadata.webpUrl));
                }

                if (file.provider_metadata && file.provider_metadata.avifUrl) {
                    deletions.push(deleteFile(file.provider_metadata.avifUrl));
                }

                if (file.webpUrl) {
                    deletions.push(deleteFile(file.webpUrl));
                }

                if (file.avifUrl) {
                    deletions.push(deleteFile(file.avifUrl));
                }


                return Promise.all(deletions).then(resolve, err => reject(err));
            }),
        };
    }
};
