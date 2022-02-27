import {
    BlobServiceClient,
    StorageSharedKeyCredential,
} from '@azure/storage-blob'
import { BufferStream } from './utils/BufferStream';
import { trimParam } from './utils/trimParam';

type Config = {
    account: string;
    accountKey: string;
    serviceBaseURL: string;
    containerName: string;
    defaultPath: string;
    maxConcurent: string;
    cdnUrl: string;
}

export default {
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
        cdnUrl: {
            label: 'Expose public CDN URL instead of service URL',
            type: 'text',
        },
    },
    init: (config: Config) => {
        const account = trimParam(config.account);
        const accountKey = trimParam(config.accountKey);
        const containerName = trimParam(config.containerName)
        const cdnUrl = trimParam(config.cdnUrl);
        const serviceBaseURL = trimParam(config.serviceBaseURL) || `https://${account}.blob.core.windows.net`

        const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
        const client = new BlobServiceClient(serviceBaseURL, sharedKeyCredential);

        return {
            upload: file => new Promise((resolve: () => {}, reject: () => {}) => {

                const container = client.getContainerClient(containerName)
                const fileName = file.hash + file.ext;
                // const containerWithPath = Object.assign({}, containerURL);
                // containerWithPath.url += file.path ? `/${file.path}` : `/${config.defaultPath}`;

                // const blobURL = BlobURL.fromContainerURL(containerWithPath, fileName);
                // const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);

                // file.url = cdnBaseURL 
                //     ? blobURL.url.replace(serviceBaseURL, cdnBaseURL)
                //     : blobURL.url;

                // return uploadStreamToBlockBlob(
                //     Aborter.timeout(60 * 60 * 1000),
                //     new BufferStream(file.buffer), blockBlobURL,
                //     4 * 1024 * 1024,
                //     ~~(config.maxConcurent) || 20,
                //     {
                //         blobHTTPHeaders: {
                //             blobContentType: file.mime
                //         }
                //     }
                // ).then(resolve, reject);
            }),
            delete: (file: { url: string }) => new Promise((resolve, reject) => {
                // let fileUrl = file.url;
                // if (cdnBaseURL) {
                //     fileUrl = fileUrl.replace(cdnBaseURL, serviceBaseURL);
                // }
                // const _temp = fileUrl.replace(containerURL.url, '');
                // const pathParts = _temp.split('/').filter(x => x.length > 0);
                // const fileName = pathParts.splice(pathParts.length - 1, 1);
                // const containerWithPath = Object.assign({}, containerURL);
                // containerWithPath.url += '/' + pathParts.join('/');

                // const blobURL = BlobURL.fromContainerURL(containerWithPath, fileName);
                // const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);

                // return blockBlobURL.delete().then(resolve, (err: Error) => reject(err));
            }),
        };
    }
};
