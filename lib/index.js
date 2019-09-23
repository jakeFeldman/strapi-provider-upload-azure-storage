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

const trimParam = str => (typeof str === 'string' ? str.trim() : undefined);

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
        containerName: {
            label: 'Container name',
            type: 'text',
        },
        defaultPath: {
            label: 'The path to user when there is none being specified',
            type: 'text',
        },
        maxConcurent: {
            label: 'The maximum concurent uploads to Azure',
            type: 'number'
        },
    },
    init: config => {
        const account = trimParam(config.account);
        const accountKey = trimParam(config.accountKey);
        const sharedKeyCredential = new SharedKeyCredential(account, accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);
        const serviceURL = new ServiceURL(`https://${account}.blob.core.windows.net`, pipeline);
        const containerURL = ContainerURL.fromServiceURL(serviceURL, config.containerName);

        return {
            upload: file => new Promise((resolve, reject) => {
                const fileName = file.hash + file.ext;
                const containerWithPath = Object.assign({}, containerURL);
                containerWithPath.url += file.path ? `/${file.path}` : `/${config.defaultPath}`;

                const blobURL = BlobURL.fromContainerURL(containerWithPath, fileName);
                const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);

                file.url = blobURL.url;

                return uploadStreamToBlockBlob(
                    Aborter.timeout(60 * 60 * 1000),
                    new BufferStream(file.buffer), blockBlobURL,
                    4 * 1024 * 1024,
                    ~~(config.maxConcurent) || 20,
                    {
                        blobHTTPHeaders: {
                            blobContentType: file.mime
                        }
                    }
                ).then(resolve, reject);
            }),
            delete: file => new Promise((resolve, reject) => {
                const _temp = file.url.replace(containerURL.url, '');
                const pathParts = _temp.split('/').filter(x => x.length > 0);
                const fileName = pathParts.splice(pathParts.length - 1, 1);
                const containerWithPath = containerURL;
                containerWithPath.url += '/' + pathParts.join('/');

                const blobURL = BlobURL.fromContainerURL(containerWithPath, fileName);
                const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);

                return blockBlobURL.delete().then(resolve, err => reject(err));
            }),
        };
    }
};
