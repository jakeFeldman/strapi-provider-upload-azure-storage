import {
    AnonymousCredential,
    BlobServiceClient,
    newPipeline,
    StorageSharedKeyCredential,
} from '@azure/storage-blob';
import {
    DefaultAzureCredential,
} from '@azure/identity';
import internal from 'stream';

type Config = {
    account: string;
    accountKey?: string;
    sasToken?: string;
    managedIdentity?: string;
    serviceBaseURL?: string;
    containerName: string;
    defaultPath: string;
    cdnBaseURL?: string;
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
    const account = trimParam(config.account);
    const accountKey = trimParam(config.accountKey);
    const sasToken = trimParam(config.sasToken);
    const serviceBaseURL = getServiceBaseUrl(config);
    const managedIdentity = trimParam(config.managedIdentity);
    // if sasToken contains value, it is used as credential
    if (sasToken != '') {
        const anonymousCredential = new AnonymousCredential();
        return new BlobServiceClient(`${serviceBaseURL}${sasToken}`, anonymousCredential);
    }
    // if managedIdentity contains value, it is used as credential
    if (managedIdentity != '') {
        const aadCredential = new DefaultAzureCredential({
            managedIdentityClientId: managedIdentity
        });
        return new BlobServiceClient(serviceBaseURL, aadCredential);
    }
    // else, account & accountKey is used as credentials
    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
    const pipeline = newPipeline(sharedKeyCredential);
    return new BlobServiceClient(serviceBaseURL, pipeline);
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
        account: {
            label: 'Account name (required)',
            type: 'text',
        },
        accountKey: {
            label: 'Secret access key (conditional, required when authentication based on shared key is configured)',
            type: 'text',
        },
        sasToken: {
            label: 'SAS token (conditional, required when authentication based on SAS is configured)',
            type: 'text',
        },
        managedIdentity: {
            label: 'Managed Identity Client ID (conditional, required when authentication based on Managed Identity is configured)',
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
