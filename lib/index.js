const {
    BlobServiceClient,
    StorageSharedKeyCredential,
    newPipeline,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('@azure/storage-blob');

function trimParam(input) {
    return typeof input === 'string' ? input.trim() : undefined;
}

function getServiceBaseUrl(config) {
    return (
        trimParam(config.serviceBaseURL) ||
        `https://${trimParam(config.account)}.blob.core.windows.net`
    );
}

function makeBlobServiceClient(config) {
    const account = trimParam(config.account);
    const accountKey = trimParam(config.accountKey);
    const serviceBaseURL = getServiceBaseUrl(config);

    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
    const pipeline = newPipeline(sharedKeyCredential);
    return new BlobServiceClient(serviceBaseURL, pipeline);
}

const uploadOptions = {
    bufferSize: 4 * 1024 * 1024, // 4MB
    maxBuffers: 20,
};

function handleUpload(config, blobSvcClient, file) {
    return async () => {
        const serviceBaseURL = getServiceBaseUrl(config);
        const containerClient = blobSvcClient.getContainerClient(trimParam(config.containerName));
        const client = containerClient.getBlockBlobClient(
            `${trimParam(config.defaultPath)}/${file.hash}`
        );
        const options = {
            blobHTTPHeaders: { blobContentType: file.mime },
        };

        const cdnBaseURL = trimParam(config.cdnBaseURL);
        file.url = cdnBaseURL ? client.url.replace(serviceBaseURL, cdnBaseURL) : client.url;

        await client.uploadStream(
            file.stream,
            uploadOptions.bufferSize,
            uploadOptions.maxBuffers,
            options
        );
    };
}

function handleDelete(config, blobSvcClient, file) {
    return async () => {
        const containerClient = blobSvcClient.getContainerClient(trimParam(config.containerName));
        const client = containerClient.getBlobClient(
            `${trimParam(config.defaultPath)}/${file.hash}`
        );
        await client.delete();
        file.url = client.url;
    };
}

module.exports = {
    provider: 'azure',
    auth: {
        account: {
            label: 'Account name (required)',
            type: 'text',
        },
        accountKey: {
            label: 'Secret access key (required)',
            type: 'text',
        },
        serviceBaseURL: {
            label: 'Base service URL to be used, optional. Defaults to https://${account}.blob.core.windows.net (optional)',
            type: 'text',
        },
        containerName: {
            label: 'Container name (required)',
            type: 'text',
        },
        defaultPath: {
            label: 'The path to use when there is none being specified (required)',
            type: 'text',
        },
        cdnBaseURL: {
            label: 'CDN base url (optional)',
            type: 'text',
        },
    },
    init: (config) => {
        const blobSvcClient = makeBlobServiceClient(config);
        return {
            upload(file) {
                return handleUpload(config, blobSvcClient, file);
            },
            uploadStream(file) {
                return handleUpload(config, blobSvcClient, file);
            },
            delete(file) {
                return handleDelete(config, blobSvcClient, file);
            },
        };
    },
};
