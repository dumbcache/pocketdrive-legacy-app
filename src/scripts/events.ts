import { DropItems } from "../types";
import { createDropItem } from "./helpers";
import { signUserOut, togglePreview } from "./utils";

const dropItems: DropItems = {};

export function initTouchEvents(childWorker: Worker) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const header = document.querySelector(".header") as HTMLDivElement;

    function checkDirection() {
        if (Math.abs(touchStartX - touchEndX) > 40) {
            //swipe left
            if (touchStartX > touchEndX) {
                previewChange("NEXT", childWorker);
                return;
            }
            //swipe right
            if (touchStartX < touchEndX) {
                previewChange("PREV", childWorker);
                return;
            }
        }
        if (Math.abs(touchStartY - touchEndY) > 40) {
            // swipe down
            if (touchStartY < touchEndY) {
                preview.hidden = true;
                return;
            }
            // swipe up
            if (touchStartY > touchEndY) {
                preview.hidden = true;
                return;
            }
        }
    }
    preview.addEventListener("touchstart", (e) => {
        if (e.touches.length >= 2) return;
        e.stopPropagation();
        if ((e.target as HTMLImageElement).classList.contains("preview-img")) {
            if (e.changedTouches.length === 0) return;
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }
    });
    preview.addEventListener("touchend", (e) => {
        if (e.touches.length >= 2) return;
        e.stopPropagation();
        if ((e.target as HTMLImageElement).classList.contains("preview-img")) {
            if (e.changedTouches.length === 0) return;
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            checkDirection();
        }
    });

    preview.addEventListener("touchmove", (e) => {
        if (e.touches.length >= 2) return;
        e.preventDefault();
        e.stopPropagation();
    });
    header.addEventListener("click", () => {
        const main = document.querySelector(".main-wrapper") as HTMLDivElement;
        main.scrollTo(0, 0);
    });
}

export function initMenuEvents() {
    const refresh = document.querySelector(
        ".refresh-button"
    ) as HTMLButtonElement;
    const back = document.querySelector(".back-button") as HTMLButtonElement;
    const signoutButton = document.querySelector(
        ".signout-button"
    )! as HTMLDivElement;
    refresh.addEventListener("click", (e) => {
        e.stopPropagation();
        window.dispatchEvent(new Event("refresh"));
    });
    back.addEventListener("click", (e) => {
        e.stopPropagation();
        window.history.back();
    });
    signoutButton.addEventListener("click", signUserOut);
}

export function initPreviewClose() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewClose = document.querySelector(
        ".preview-close"
    ) as HTMLDivElement;
    previewClose.addEventListener("click", () => {
        preview.hidden = true;
    });
}

export function initPreviewFull() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewExpand = document.querySelector(
        ".preview-expand"
    ) as HTMLDivElement;
    previewExpand.addEventListener("click", () => {
        preview.classList.toggle("preview-full");
    });
}

export function previewChange(type: "PREV" | "NEXT", childWorker: Worker) {
    const previewImg = document.querySelector(
        ".preview-img"
    ) as HTMLImageElement;
    const imgs = document.querySelector(".imgs") as HTMLDivElement;
    const targetImg = imgs.querySelector(
        `[data-id='${previewImg.dataset.id}']`
    );
    const targetParent = targetImg?.parentElement;
    const latestParent =
        type === "NEXT"
            ? targetParent?.nextElementSibling
            : targetParent?.previousElementSibling;
    if (!latestParent) return;
    const latestImg = latestParent?.firstElementChild as HTMLImageElement;
    const latestId = latestImg.dataset.id;
    previewImg.src = latestImg.src;
    previewImg.dataset.id = latestId;
    if (latestImg.dataset.url) {
        previewImg.src = latestImg.dataset.url;
    } else {
        const token = window.localStorage.getItem("token")!;
        childWorker.postMessage({
            context: "FETCH_IMAGE",
            id: latestId,
            token,
        });
    }
}

export function initPreviewChange(childWorker: Worker) {
    const previewPrev = document.querySelector(
        ".preview-prev"
    ) as HTMLDivElement;
    const previewNext = document.querySelector(
        ".preview-next"
    ) as HTMLDivElement;
    previewPrev.onclick = () => previewChange("PREV", childWorker);
    previewNext.onclick = () => previewChange("NEXT", childWorker);
}

export function initPreviewEvents(childWorker: Worker) {
    initPreviewClose();
    initPreviewFull();
    initPreviewChange(childWorker);
}

function initImgEvents(childWorker: Worker) {
    const imgsEle = document.querySelector(".imgs") as HTMLDivElement;
    imgsEle?.addEventListener("click", async (e) => {
        const target = e.target as HTMLImageElement;
        if (!target.classList.contains("img")) return;
        const dataset = target.dataset;
        const previewImg = document.querySelector(
            ".preview-img"
        ) as HTMLImageElement;
        if (previewImg.dataset.id === dataset.id) {
            togglePreview(false);
            return;
        }
        previewImg.src = target.src;
        previewImg.dataset.id = target.dataset.id;
        togglePreview(false);
        if (dataset.url) {
            previewImg.src = dataset.url;
        } else {
            const token = window.localStorage.getItem("token")!;
            childWorker.postMessage({
                context: "FETCH_IMAGE",
                id: dataset.id,
                token,
            });
        }
    });
}

export function dropResultHandler(id: number, status: number) {
    const dropArea = document.querySelector(".drop-area") as HTMLDivElement;
    const dropItem = dropArea.querySelector(
        `[data-id='${id}']`
    ) as HTMLDivElement;
    let dropProgress = dropItem.querySelector(
        ".drop-progress"
    ) as HTMLImageElement;
    if (status !== 200) {
        let dropImg = dropItem.querySelector(".drop-img") as HTMLImageElement;
        let name = dropItem.querySelector(".name") as HTMLInputElement;
        let url = dropItem.querySelector(".url") as HTMLInputElement;
        name.hidden = false;
        url.hidden = false;
        dropProgress.hidden = true;
        dropImg.classList.toggle("drop-item-uploading");
        return;
    }

    dropProgress.src = new URL(
        "../assets/success.svg",
        import.meta.url
    ).toString();
    dropProgress.classList.toggle("drop-progress-result");
    delete dropItems[id];
    setTimeout(() => {
        dropArea.removeChild(dropItem);
        if (Object.entries(dropItems).length === 0) {
            const dropZone = document.querySelector(
                ".drop-zone"
            ) as HTMLDivElement;
            dropZone.hidden = true;
            (document.querySelector(".common-url") as HTMLInputElement).value =
                "";
        }
    }, 5000);
    return;
}

export function dropOkHandler(childWorker: Worker) {
    const dropArea = document.querySelector(".drop-area") as HTMLDivElement;
    const commonUrl = (
        document.querySelector(".common-url") as HTMLInputElement
    ).value;
    for (let id in dropItems) {
        const dropItem = dropArea.querySelector(
            `[data-id='${id}']`
        ) as HTMLDivElement;
        let dropImg = dropItem.querySelector(".drop-img") as HTMLImageElement;
        dropImg.classList.toggle("drop-item-uploading");
        let dropProgress = dropItem.querySelector(
            ".drop-progress"
        ) as HTMLImageElement;
        dropProgress.hidden = false;
        let name = dropItem.querySelector(".name") as HTMLInputElement;
        dropItems[id].name = name.value.trim();
        let url = dropItem.querySelector(".url") as HTMLInputElement;
        if (commonUrl.trim() === "") {
            dropItems[id].url = url.value.trim();
        } else {
            dropItems[id].url = commonUrl.trim();
        }
        name.hidden = true;
        url.hidden = true;
    }
    const { pathname } = window.location;
    const parent =
        pathname === "/"
            ? window.localStorage.getItem("root")!
            : pathname.substring(1);
    const token = window.localStorage.getItem("token");
    childWorker.postMessage({
        context: "DROP_SAVE",
        dropItems,
        parent,
        token,
    });
}
export function dropCancelHandler() {
    const dropZone = document.querySelector(".drop-zone") as HTMLDivElement;
    const dropArea = document.querySelector(".drop-area") as HTMLDivElement;
    dropZone.hidden = true;
    for (let id in dropItems) {
        URL.revokeObjectURL(dropItems[id].imgRef!);
        delete dropItems[id];
    }
    dropArea.innerHTML = "";
}

export function previewLoadDropItem(img: File, dropArea: HTMLDivElement) {
    const dropParent = document.querySelector(
        ".drop-parent"
    ) as HTMLSpanElement;
    dropParent.innerHTML = history.state?.dir || "root";
    const id = Date.now();
    const imgRef = URL.createObjectURL(img);
    const dropItem = createDropItem(imgRef, id, img.name);
    dropArea.insertAdjacentHTML("beforeend", dropItem);
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result! as ArrayBuffer;
        const bytes = new Uint8Array(result);
        dropItems[id] = { name: img.name, mimeType: img.type, bytes, imgRef };
    };
    reader.readAsArrayBuffer(img);
}

export function initUploadEvents(childWorker: Worker) {
    const main = document.querySelector(".main") as HTMLDivElement;
    const imgPicker = document.querySelector("#img-picker") as HTMLInputElement;
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const dropZone = document.querySelector(".drop-zone") as HTMLDivElement;
    const dropArea = document.querySelector(".drop-area") as HTMLDivElement;
    const dropOk = document.querySelector(".drop-ok") as HTMLDivElement;
    const dropCancel = document.querySelector(".drop-cancel") as HTMLDivElement;
    main.addEventListener("dragstart", (e) => {
        e.preventDefault();
    });
    main.addEventListener("dragover", (e) => {
        e.preventDefault();
    });
    main.addEventListener("dragenter", () => {
        main.classList.toggle("drop-hover");
    });
    main.addEventListener("dragleave", () => {
        main.classList.toggle("drop-hover");
    });
    main.addEventListener("drop", (e) => {
        e.preventDefault();
        main.classList.toggle("drop-hover");
        preview.hidden = true;
        for (let img of e.dataTransfer?.files!) {
            if (img.type.match("image/")) {
                dropZone.hidden = false;
                previewLoadDropItem(img, dropArea);
            }
        }
    });
    imgPicker.addEventListener("change", (e) => {
        e.preventDefault();
        const target = e.target as HTMLInputElement;
        preview.hidden = true;
        for (let img of target.files!) {
            if (img.type.match("image/")) {
                dropZone.hidden = false;
                previewLoadDropItem(img, dropArea);
            }
        }
        console.log(dropItems);
    });
    dropOk.addEventListener("click", () => dropOkHandler(childWorker));
    dropCancel.addEventListener("click", () => dropCancelHandler());
    dropZone.addEventListener("touchmove", (e) => {
        e.stopPropagation();
    });
    dropZone.addEventListener("touchstart", (e) => {
        e.stopPropagation();
    });
}

export function initMainEvents(childWorker: Worker) {
    initTouchEvents(childWorker);
    initImgEvents(childWorker);
    initPreviewEvents(childWorker);
    initUploadEvents(childWorker);
}
