import { DIR_MIME_TYPE, IMG_MIME_TYPE, getFiles } from "../scripts/drive";

async function fetchAndCacheCovers(data: any, krabsCache: Cache) {
    return new Promise((resolve, reject) => {
        const { parent, token } = data;
        getFiles(parent, token, IMG_MIME_TYPE, 3)
            .then(async (files) => {
                krabsCache.put(
                    `/${parent}?type=covers`,
                    new Response(JSON.stringify(files))
                );
                resolve(files);
            })
            .catch((e) => {
                reject(e.status);
            });
    });
}

async function fetchAndCacheFiles(data: any, krabsCache: Cache) {
    return new Promise((resolve, reject) => {
        Promise.all([
            getFiles(data.parent, data.token, DIR_MIME_TYPE),
            getFiles(data.parent, data.token, IMG_MIME_TYPE),
        ])
            .then(async ([dirs, imgs]) => {
                krabsCache.put(
                    `/${data.parent}?type=dirs`,
                    new Response(JSON.stringify(dirs!))
                );
                krabsCache.put(
                    `/${data.parent}?type=imgs`,
                    new Response(JSON.stringify(imgs!))
                );
                resolve([dirs, imgs]);
            })
            .catch(async (e) => {
                reject(e);
            });
    });
}

async function fetchFiles(
    data: any,
    krabsCache: Cache,
    refresh: Boolean = false
) {
    const context = refresh === false ? "FETCH_FILES" : "REFRESH_FILES";
    if (refresh !== true) {
        const dirRes = await krabsCache.match(`/${data.parent}?type=dirs`);
        const imgsRes = await krabsCache.match(`/${data.parent}?type=imgs`);
        if (dirRes && imgsRes) {
            const dirs = await dirRes.json();
            const imgs = await imgsRes.json();
            postMessage({ context, files: [dirs, imgs] });
            return;
        }
    }
    fetchAndCacheFiles(data, krabsCache)
        .then((files) => {
            postMessage({ context, files });
        })
        .catch((e) => {
            postMessage({
                context: "FETCH_FILES_FAILED",
                status: e.status,
            });
            console.warn(e);
        });
    return;
}
async function fetchCovers(
    data: any,
    krabsCache: Cache,
    refresh: Boolean = false
) {
    const { parent } = data;
    const context = refresh === false ? "FETCH_COVERS" : "REFRESH_COVERS";
    if (refresh !== true) {
        const coverRes = await krabsCache.match(`/${parent}?type=covers`);
        if (coverRes) {
            const files = await coverRes.json();
            postMessage({
                context,
                files,
                parent,
            });
            return;
        }
    }
    fetchAndCacheCovers(data, krabsCache)
        .then(async (files) => {
            postMessage({
                context,
                files,
                parent,
            });
        })
        .catch((e) => {
            postMessage({
                context: "FETCH_FILES_FAILED",
                status: e.status,
            });
            console.warn(e);
        });
    return;
}

onmessage = async ({ data }) => {
    const krabsCache = await caches.open("krabs");
    switch (data.context) {
        case "FETCH_FILES":
            fetchFiles(data, krabsCache);
            return;

        case "FETCH_COVERS":
            fetchCovers(data, krabsCache);
            return;

        case "REFRESH_FILES":
            fetchFiles(data, krabsCache, true);
            return;

        case "REFRESH_COVERS":
            fetchCovers(data, krabsCache, true);
            return;
    }
};
onmessageerror = (e) => console.warn(e);
