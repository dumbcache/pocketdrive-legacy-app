import {
    getToken,
    isLoggedin,
    isUserOnline,
    togglePreview,
} from "./scripts/utils";
import { generateCovers, crateMaincontent } from "./scripts/helpers";
import "./css/app.css";
import {
    dropResultHandler,
    initMainEvents,
    previewChange,
} from "./scripts/events";

let worker: Worker, childWorker: Worker;
document.addEventListener("DOMContentLoaded", async () => {
    if (isLoggedin()) {
        isUserOnline(true);
        initMainEvents(childWorker);
        window.dispatchEvent(new Event("locationchange"));
    } else {
        isUserOnline(false);
    }
});

if (window.Worker) {
    worker = new Worker(new URL("workers/worker.ts", import.meta.url), {
        type: "module",
    });
    childWorker = new Worker(
        new URL("workers/childWorker.ts", import.meta.url),
        {
            type: "module",
        }
    );
    /************ worker ************/
    worker.onerror = (e) => console.warn(e);
    worker.onmessage = ({ data }) => {
        switch (data.context) {
            case "FETCH_FILES":
                crateMaincontent(data.files, worker);
                return;
            case "FETCH_COVERS":
                generateCovers(data.parent, data.files);
                return;
            case "REFRESH_FILES":
                crateMaincontent(data.files, worker, true);
                return;
            case "REFRESH_COVERS":
                generateCovers(data.parent, data.files);
                return;
            case "FETCH_FILES_FAILED":
                if (data.status === 401) {
                    getToken();
                    return;
                }
        }
    };

    /************ Child worker ************/
    childWorker.onerror = (e) => console.warn(e);
    childWorker.onmessage = ({ data }) => {
        switch (data.context) {
            case "FETCH_IMAGE":
                const { id, blob } = data;
                const previewImg = document.querySelector(
                    ".preview-img"
                ) as HTMLImageElement;
                const target = document.querySelector(
                    `[data-id='${id}']`
                ) as HTMLDivElement;
                if (previewImg.dataset.id !== id) return;
                const url = URL.createObjectURL(blob);
                previewImg.src = url;
                target.dataset.url = url;
                return;

            case "IMAGE_FAILED":
                if (data.status === 401) {
                    getToken();
                    return;
                }
                return;
            case "DROP_SAVE":
                dropResultHandler(data.id, 200);
                return;
            case "DROP_SAVE_FAILED":
                dropResultHandler(data.id, data.status);
                if (data.status === 401) {
                    getToken();
                    return;
                }
                return;
            case "IDB_RELOAD_REQUIRED":
                return;
        }
    };
}

window.addEventListener("locationchange", async () => {
    try {
        const { pathname } = window.location;
        const back = document.querySelector(
            ".back-button"
        ) as HTMLButtonElement;
        togglePreview(true);
        pathname === "/" ? (back.hidden = true) : (back.hidden = false);
        const root =
            pathname === "/"
                ? window.localStorage.getItem("root")!
                : pathname.substring(1);
        const token = window.localStorage.getItem("token");
        worker.postMessage({ context: "FETCH_FILES", parent: root, token });
    } catch (error) {
        console.warn(error);
    }
});

window.addEventListener("refresh", () => {
    const { pathname } = window.location;
    const root =
        pathname === "/"
            ? window.localStorage.getItem("root")!
            : pathname.substring(1);
    const token = window.localStorage.getItem("token");
    worker.postMessage({ context: "REFRESH_FILES", parent: root, token });
});

window.addEventListener("keydown", (e) => {
    if (e.altKey || e.metaKey || e.ctrlKey) {
        return;
    }
    const preview = document.querySelector(".preview") as HTMLDivElement;
    if (preview.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    switch (e.key) {
        case "ArrowRight":
            previewChange("NEXT", childWorker);
            return;
        case "ArrowLeft":
            previewChange("PREV", childWorker);
            return;
        case "ArrowDown":
            togglePreview(true);
            return;
        case "ArrowUp":
            const preview = document.querySelector(
                ".preview"
            ) as HTMLDivElement;
            preview.classList.toggle("preview-full");
            return;
        case "Escape":
            togglePreview(true);
            return;
    }
});

window.addEventListener("offline", () => {
    console.log("offline");
});

window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("locationchange"));
});
