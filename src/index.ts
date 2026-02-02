import { DefaultAzureCredential } from '@azure/identity';
import {
    AnonymousCredential,
    BlobSASPermissions,
    BlobServiceClient,
    generateBlobSASQueryParameters,
    PublicAccessType,
    SASProtocol,
    StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { Readable } from 'stream';

// ============================================================================
// Types
// ============================================================================

interface BaseConfig {
    account: string;
    containerName: string;
    defaultPath?: string;
    serviceBaseURL?: string;
    cdnBaseURL?: string;
    cacheControl?: string;
    createContainerIfNotExist?: boolean;
    publicAccessType?: PublicAccessType;
    removeContainerFromUrl?: boolean;
    uploadOptions?: {
        bufferSize?: number;
        maxConcurrency?: number;
    };
    isPrivate?: boolean;
    signedUrlExpiry?: number;
}

interface AccountKeyConfig extends BaseConfig {
    authType: 'accountKey';
    accountKey: string;
}

interface SasTokenConfig extends BaseConfig {
    authType: 'sasToken';
    sasToken: string;
}

interface ManagedIdentityConfig extends BaseConfig {
    authType: 'msi';
    clientId?: string;
}

type ProviderConfig = AccountKeyConfig | SasTokenConfig | ManagedIdentityConfig;

interface StrapiFile {
    name: string;
    hash: string;
    ext: string;
    mime: string;
    path?: string;
    url: string;
    buffer?: Buffer;
    stream?: Readable;
    size?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

function trimParam(input?: string): string {
    return typeof input === 'string' ? input.trim() : '';
}

function getServiceBaseUrl(config: ProviderConfig): string {
    return (
        trimParam(config.serviceBaseURL) ||
        `https://${trimParam(config.account)}.blob.core.windows.net`
    );
}

function isRootContainer(containerName: string): boolean {
    return trimParam(containerName).toLowerCase() === '$root';
}

function getBlobName(config: ProviderConfig, file: StrapiFile): string {
    const fileName = `${file.hash}${file.ext}`;
    const path = trimParam(config.defaultPath);

    if (isRootContainer(config.containerName) || path === '') {
        return fileName;
    }

    return `${path}/${fileName}`;
}

function buildFileUrl(config: ProviderConfig, blobUrl: string, serviceBaseURL: string): string {
    let url = blobUrl;

    const cdnBaseURL = trimParam(config.cdnBaseURL);
    if (cdnBaseURL) {
        url = url.replace(serviceBaseURL, cdnBaseURL);
    }

    if (config.removeContainerFromUrl) {
        const containerName = trimParam(config.containerName);
        const rawSegment = `/${containerName}/`;
        const encodedSegment = `/${encodeURIComponent(containerName)}/`;

        if (url.includes(rawSegment)) {
            url = url.replace(rawSegment, '/');
        } else if (url.includes(encodedSegment)) {
            url = url.replace(encodedSegment, '/');
        }
    }

    return url;
}

// ============================================================================
// Azure Client Factory
// ============================================================================

interface AzureClients {
    blobServiceClient: BlobServiceClient;
    sharedKeyCredential?: StorageSharedKeyCredential;
    defaultAzureCredential?: DefaultAzureCredential;
}

function createAzureClients(config: ProviderConfig): AzureClients {
    const serviceBaseURL = getServiceBaseUrl(config);

    switch (config.authType) {
        case 'accountKey': {
            const account = trimParam(config.account);
            const accountKey = trimParam(config.accountKey);
            const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
            const blobServiceClient = new BlobServiceClient(serviceBaseURL, sharedKeyCredential);
            return { blobServiceClient, sharedKeyCredential };
        }

        case 'sasToken': {
            const sasToken = trimParam(config.sasToken);
            const urlWithSas = sasToken.startsWith('?')
                ? `${serviceBaseURL}${sasToken}`
                : `${serviceBaseURL}?${sasToken}`;
            const blobServiceClient = new BlobServiceClient(urlWithSas, new AnonymousCredential());
            return { blobServiceClient };
        }

        case 'msi': {
            const clientId = trimParam(config.clientId);
            const defaultAzureCredential = clientId
                ? new DefaultAzureCredential({ managedIdentityClientId: clientId })
                : new DefaultAzureCredential();
            const blobServiceClient = new BlobServiceClient(serviceBaseURL, defaultAzureCredential);
            return { blobServiceClient, defaultAzureCredential };
        }

        default: {
            const exhaustiveCheck: never = config;
            throw new Error(`Unknown auth type: ${JSON.stringify(exhaustiveCheck)}`);
        }
    }
}

// ============================================================================
// Upload Options
// ============================================================================

const DEFAULT_BUFFER_SIZE = 4 * 1024 * 1024; // 4MB
const DEFAULT_MAX_CONCURRENCY = 20;
const DEFAULT_SIGNED_URL_EXPIRY_MINUTES = 60;

// ============================================================================
// Provider Implementation
// ============================================================================

async function ensureContainer(
    config: ProviderConfig,
    blobServiceClient: BlobServiceClient
): Promise<void> {
    if (!config.createContainerIfNotExist) {
        return;
    }

    const containerClient = blobServiceClient.getContainerClient(trimParam(config.containerName));
    const accessType = config.publicAccessType;

    if (accessType === 'container' || accessType === 'blob') {
        await containerClient.createIfNotExists({ access: accessType });
    } else {
        await containerClient.createIfNotExists();
    }
}

async function handleUpload(
    config: ProviderConfig,
    clients: AzureClients,
    file: StrapiFile,
    useStream: boolean
): Promise<void> {
    const serviceBaseURL = getServiceBaseUrl(config);
    const containerClient = clients.blobServiceClient.getContainerClient(
        trimParam(config.containerName)
    );
    const blobName = getBlobName(config, file);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await ensureContainer(config, clients.blobServiceClient);

    const blobHTTPHeaders = {
        blobContentType: file.mime,
        blobCacheControl: trimParam(config.cacheControl),
    };

    if (useStream && file.stream) {
        const bufferSize = config.uploadOptions?.bufferSize ?? DEFAULT_BUFFER_SIZE;
        const maxConcurrency = config.uploadOptions?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;

        await blockBlobClient.uploadStream(file.stream, bufferSize, maxConcurrency, {
            blobHTTPHeaders,
        });
    } else if (file.buffer) {
        await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders,
        });
    } else {
        throw new Error('File must have either a buffer or stream property');
    }

    file.url = buildFileUrl(config, blockBlobClient.url, serviceBaseURL);
}

async function handleDelete(
    config: ProviderConfig,
    clients: AzureClients,
    file: StrapiFile
): Promise<void> {
    const containerClient = clients.blobServiceClient.getContainerClient(
        trimParam(config.containerName)
    );
    const blobName = getBlobName(config, file);
    const blobClient = containerClient.getBlobClient(blobName);

    await blobClient.deleteIfExists();
}

async function handleGetSignedUrl(
    config: ProviderConfig,
    clients: AzureClients,
    file: StrapiFile
): Promise<{ url: string }> {
    if (config.authType === 'sasToken') {
        throw new Error(
            'Cannot generate signed URLs when using SAS token authentication. ' +
                'SAS tokens cannot be used to create new signed URLs. ' +
                'Use accountKey or msi authentication instead.'
        );
    }

    const containerName = trimParam(config.containerName);
    const blobName = getBlobName(config, file);
    const expiryMinutes = config.signedUrlExpiry ?? DEFAULT_SIGNED_URL_EXPIRY_MINUTES;

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiryMinutes * 60 * 1000);

    const permissions = BlobSASPermissions.parse('r');

    const containerClient = clients.blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    let sasQueryParams: string;

    if (config.authType === 'accountKey' && clients.sharedKeyCredential) {
        sasQueryParams = generateBlobSASQueryParameters(
            {
                containerName,
                blobName,
                permissions,
                startsOn,
                expiresOn,
                protocol: SASProtocol.Https,
            },
            clients.sharedKeyCredential
        ).toString();
    } else if (config.authType === 'msi' && clients.defaultAzureCredential) {
        const userDelegationKey = await clients.blobServiceClient.getUserDelegationKey(
            startsOn,
            expiresOn
        );

        sasQueryParams = generateBlobSASQueryParameters(
            {
                containerName,
                blobName,
                permissions,
                startsOn,
                expiresOn,
                protocol: SASProtocol.Https,
            },
            userDelegationKey,
            trimParam(config.account)
        ).toString();
    } else {
        throw new Error('Unable to generate signed URL: missing credentials');
    }

    const signedUrl = `${blobClient.url}?${sasQueryParams}`;

    return { url: signedUrl };
}

// ============================================================================
// Module Export
// ============================================================================

module.exports = {
    init(config: ProviderConfig) {
        const clients = createAzureClients(config);

        return {
            async upload(file: StrapiFile): Promise<void> {
                return handleUpload(config, clients, file, false);
            },

            async uploadStream(file: StrapiFile): Promise<void> {
                return handleUpload(config, clients, file, true);
            },

            async delete(file: StrapiFile): Promise<void> {
                return handleDelete(config, clients, file);
            },

            isPrivate(): boolean {
                return config.isPrivate === true;
            },

            async getSignedUrl(file: StrapiFile): Promise<{ url: string }> {
                return handleGetSignedUrl(config, clients, file);
            },
        };
    },
};
