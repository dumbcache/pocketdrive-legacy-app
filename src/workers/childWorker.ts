import { createImgMetadata, downloadImage, uploadImg } from "../scripts/drive";
import { DropItems, ImgMeta } from "../types";

let idbRequest: IDBOpenDBRequest;
(() => {
    idbRequest = indexedDB.open("krabfiles", 1);
    idbRequest.onsuccess = () => {
        const db = idbRequest.result;
        db.onversionchange = () => {
            postMessage({ context: "IDB_RELOAD_REQUIRED" });
        };
        db.onclose = (e) => {
            console.log(`db closed`, e);
        };
        db.onerror = (e) => {
            console.log(`db errored out`, e);
        };
    };
    idbRequest.onupgradeneeded = () => {
        const db = idbRequest.result;
        if (!db.objectStoreNames.contains("images")) {
            db.createObjectStore("images", { keyPath: "id" });
        }
    };
    idbRequest.onerror = () => {
        console.log(idbRequest.error);
    };
    idbRequest.onblocked = (e) => {
        console.log(`dbclosed`, e);
        postMessage({ context: "IDB_RELOAD_REQUIRED" });
    };
})();

function checkForImgLocal(id: string, token: string) {
    const db = idbRequest.result;
    const objectStore = db.transaction("images").objectStore("images");
    const req = objectStore.get(id);
    req.onsuccess = async (e) => {
        const result = (e.target as IDBRequest).result;
        if (!result) {
            downloadImage(id, token)
                .then((blob) => {
                    const objectStore = db
                        .transaction("images", "readwrite")
                        .objectStore("images");
                    objectStore.put({ id, blob });
                    postMessage({ context: "FETCH_IMAGE", id, blob });
                })
                .catch((e) => {
                    postMessage({
                        context: "IMAGE_FAILED",
                        status: e.status,
                    });
                    console.warn(e);
                });
            return;
        }
        postMessage({ context: "FETCH_IMAGE", id, blob: result.blob });
    };
}

async function dropSave(dropItems: DropItems, parent: string, token: string) {
    for (let id in dropItems) {
        const { name, url, mimeType, bytes } = dropItems[id];
        const imgMeta: ImgMeta = {
            name: name || id,
            mimeType,
            parents: [parent],
            appProperties: { origin: url || "" },
        };
        createImgMetadata(imgMeta, token)
            .then(async (location) => {
                const { status } = await uploadImg(location, bytes);
                status === 200
                    ? postMessage({
                          context: "DROP_SAVE",
                          id,
                      })
                    : postMessage({
                          context: "DROP_SAVE_FAILED",
                          id,
                          status,
                      });
            })
            .catch((e) => {
                postMessage({
                    context: "DROP_SAVE_FAILED",
                    id,
                    status: e.status,
                });
            });
    }
}
onmessage = ({ data }) => {
    switch (data.context) {
        case "FETCH_IMAGE":
            checkForImgLocal(data.id, data.token);
            return;
        case "DROP_SAVE":
            dropSave(data.dropItems, data.parent, data.token);
            // setTimeout(() => {
            //     for (let id in data.dropItems) {
            //         if (Number(id) % 2 === 0) {
            //             console.log("divisible");
            //             postMessage({
            //                 context: "DROP_SAVE",
            //                 id,
            //             });
            //         } else {
            //             postMessage({
            //                 context: "DROP_SAVE_FAILED",
            //                 id,
            //                 status: 500,
            //             });
            //         }
            //     }
            // }, 2000);
            return;
    }
};
