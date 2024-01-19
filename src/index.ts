import { DefaultAzureCredential } from '@azure/identity';
import {
    AnonymousCredential,
    BlobServiceClient,
    newPipeline,
    StorageSharedKeyCredential,
} from '@azure/storage-blob';
import internal from 'stream';

type Config = DefaultConfig | ManagedIdentityConfig;

type DefaultConfig = {
    auth_type: 'default';
    accountKey: string;
    sasToken: string;
    account: string;
    serviceBaseURL?: string;
    containerName: string;
    defaultPath: string;
    cdnBaseURL?: string;
    defaultCacheControl?: string;
    removeCN?: string;
};

type ManagedIdentityConfig = {
    auth_type: 'msi';
    account: string;
    serviceBaseURL?: string;
    containerName: string;
    defaultPath: string;
    cdnBaseURL?: string;
    defaultCacheControl?: string;
    removeCN?: string;
};

type StrapiFile = File & {
    stream: internal.Readable;
    hash: string;
    url: string;
    ext: string;
    mime: string;
    path: string;
};

function trimParam(input?: string) {
    return typeof input === 'string' ? input.trim() : '';
}

function getServiceBaseUrl(config: Config) {
    return (
        trimParam(config.serviceBaseURL) ||
        `https://${trimParam(config.account)}.blob.core.windows.net`
    );
}

function getFileName(path: string, file: StrapiFile) {
    return `${trimParam(path)}/${file.hash}${file.ext}`;
}

function makeBlobServiceClient(config: Config) {
    const serviceBaseURL = getServiceBaseUrl(config);

    switch (config.auth_type) {
        case 'default':
            const account = trimParam(config.account);
            const accountKey = trimParam(config.accountKey);
            const sasToken = trimParam(config.sasToken);
            if (sasToken != '') {
                const anonymousCredential = new AnonymousCredential();
                return new BlobServiceClient(`${serviceBaseURL}${sasToken}`, anonymousCredential);
            }
            const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
            const pipeline = newPipeline(sharedKeyCredential);
            return new BlobServiceClient(serviceBaseURL, pipeline);

        case 'msi':
            return new BlobServiceClient(serviceBaseURL, new DefaultAzureCredential());
    }
}

const uploadOptions = {
    bufferSize: 4 * 1024 * 1024, // 4MB
    maxBuffers: 20,
};

async function handleUpload(
    config: Config,
    blobSvcClient: BlobServiceClient,
    file: StrapiFile
): Promise<void> {
    const serviceBaseURL = getServiceBaseUrl(config);
    const containerClient = blobSvcClient.getContainerClient(trimParam(config.containerName));
    const client = containerClient.getBlockBlobClient(getFileName(config.defaultPath, file));
    const options = {
        blobHTTPHeaders: {
            blobContentType: file.mime,
            blobCacheControl: trimParam(config.defaultCacheControl),
        },
    };

    const cdnBaseURL = trimParam(config.cdnBaseURL);
    file.url = cdnBaseURL ? client.url.replace(serviceBaseURL, cdnBaseURL) : client.url;
    if (
        file.url.includes(`/${config.containerName}/`) &&
        config.removeCN &&
        config.removeCN == 'true'
    ) {
        file.url = file.url.replace(`/${config.containerName}/`, '/');
    }

    await client.uploadStream(
        file.stream,
        uploadOptions.bufferSize,
        uploadOptions.maxBuffers,
        options
    );
}

async function handleDelete(
    config: Config,
    blobSvcClient: BlobServiceClient,
    file: StrapiFile
): Promise<void> {
    const containerClient = blobSvcClient.getContainerClient(trimParam(config.containerName));
    const client = containerClient.getBlobClient(getFileName(config.defaultPath, file));
    await client.delete();
    file.url = client.url;
}

module.exports = {
    provider: 'azure',
    auth: {
        auth_type: {
            label: 'Authentication type (required, either "msi" or "default")',
            type: 'text',
        },
        account: {
            label: 'Account name (required)',
            type: 'text',
        },
        accountKey: {
            label: 'Secret access key (required if auth_type is "default")',
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
        defaultCacheControl: {
            label: 'Default cache-control setting for all uploaded files',
            type: 'text',
        },
        removeCN: {
            label: 'Remove container name from URL (optional)',
            type: 'text',
        },
    },
    init: (config: Config) => {
        const blobSvcClient = makeBlobServiceClient(config);
        return {
            upload(file: StrapiFile) {
                return handleUpload(config, blobSvcClient, file);
            },
            uploadStream(file: StrapiFile) {
                return handleUpload(config, blobSvcClient, file);
            },
            delete(file: StrapiFile) {
                return handleDelete(config, blobSvcClient, file);
            },
        };
    },
};
