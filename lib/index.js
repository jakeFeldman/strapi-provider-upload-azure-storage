const {
    Aborter,
    BlobURL,
    BlockBlobURL,
    ContainerURL,
    ServiceURL,
    StorageURL,
    SharedKeyCredential,
    uploadStreamToBlockBlob,
    downloadBlobToBuffer
} = require("@azure/storage-blob");

module.exports = {
    provider: 'azure',
    auth: {},
    init: config => {
        return {
            upload: file => new Promise((resolve, reject) => {}),
            delete: file => new Promise((resolve, reject) => {}),
        }
    }
}
