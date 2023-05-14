import type { GoogleFile, GoogleFileRes } from "../types";
import LinkButton from "../assets/link.svg";
import { togglePreview } from "./utils";

export function createElement<T extends HTMLElement>(
    type: string,
    attributes: [string, string][] = [],
    ...childNodes: HTMLElement[] | string[]
): T {
    const ele = document.createElement(type) as T;
    for (let [key, val] of attributes) {
        ele.setAttribute(key, val);
    }
    childNodes.length !== 0 && ele.append(...childNodes);
    return ele;
}

function anchorHandler(e: Event) {
    const { id, name } = (e.currentTarget as HTMLAnchorElement).dataset;
    const { pathname } = window.location;
    if (pathname.substring(1) === id) return;
    history.pushState({ dir: name, id }, "", id);
    togglePreview(true);
    window.dispatchEvent(new Event("locationchange"));
}

export function createDir(
    file: GoogleFile,
    worker: Worker,
    refresh: Boolean
): HTMLDivElement {
    const token = window.localStorage.getItem("token")!;
    const context = refresh === false ? "FETCH_COVERS" : "REFRESH_COVERS";
    worker.postMessage({
        context,
        parent: file.id,
        token,
    });
    const cover = createElement<HTMLDivElement>("div", [
        ["class", "cover"],
        ["data-parent", file.id],
    ]);
    const title = createElement("h2", [["class", "dir-title"]], file.name);
    const anchor = createElement<HTMLAnchorElement>("a", [
        ["href", "javascript:void(0)"],
        ["data-id", file.id],
        ["data-name", file.name],
    ]);
    anchor.onclick = anchorHandler;
    anchor.append(cover);
    const div = createElement<HTMLDivElement>(
        "div",
        [["class", "dir"]],
        anchor,
        title
    );
    return div;
}

export function createImg(
    file: GoogleFile,
    className: string = ""
): HTMLDivElement {
    const frag = createElement<HTMLDivElement>("div", [["class", "img-card"]]);
    const img = createElement<HTMLImageElement>("img", [
        ["src", file.thumbnailLink!],
        ["class", className],
        ["referrerpolicy", "no-referrer"],
        ["data-id", file.id],
        ["loading", "lazy"],
        ["height", "200"],
        ["width", "200"],
    ]);
    frag.append(img);
    if (file.appProperties?.origin) {
        const linkImg = createElement("img", [["src", LinkButton]]);
        const link = createElement(
            "a",
            [
                ["target", "_blank"],
                ["class", "img-link"],
                ["href", file.appProperties.origin],
                ["rel", "noopener noreferrer nofollow"],
            ],
            linkImg
        );
        frag.append(link);
    }
    return frag;
}

export function generateCovers(id: string, imgs: GoogleFileRes) {
    const cover = document.querySelector(
        `[data-parent='${id}']`
    ) as HTMLDivElement;
    cover.innerHTML = "";
    if (cover) {
        for (let img of imgs.files) {
            const coverPic = createElement("img", [
                ["src", img.thumbnailLink!],
                ["referrerpolicy", "no-referrer"],
            ]);
            cover.append(coverPic);
        }
    }
}

function generateDirs(files: GoogleFile[], worker: Worker, refresh: Boolean) {
    const dirsEle = document.querySelector(".dirs") as HTMLDivElement;
    if (!dirsEle) return;
    dirsEle.innerHTML = "";
    for (let dir of files) {
        const folder = createDir(dir, worker, refresh);
        dirsEle?.append(folder);
    }
}
function generateImgs(files: GoogleFile[]) {
    const imgsEle = document.querySelector(".imgs") as HTMLDivElement;
    if (!imgsEle) return;
    imgsEle.innerHTML = "";
    for (let img of files) {
        const pic = createImg(img, "img");
        imgsEle?.append(pic);
    }
}

export async function crateMaincontent(
    files: [dirs: GoogleFileRes, imgs: GoogleFileRes],
    worker: Worker,
    refresh: Boolean = false
) {
    const [dirs, imgs] = files;
    const warnStatus = document.querySelector(".file-status") as HTMLDivElement;
    dirs.files.length === 0 && imgs.files.length === 0
        ? (warnStatus.hidden = false)
        : (warnStatus.hidden = true);
    generateDirs(dirs.files, worker, refresh);
    generateImgs(imgs.files);
}

export function createDropItem(src: string, id: number, name?: string) {
    return `
    <div class="drop-item" data-id="${id}">
        <img src="${src}" class="drop-img"/>
        <input type="text" class="drop-input name" placeholder="name" value="${
            name || ""
        }" onclick="this.focus();this.select()">
        <input type="text" class="drop-input url" placeholder="url" value="" onclick="this.focus();this.select();">
        <img src="${new URL(
            "../assets/progress.svg",
            import.meta.url
        )}" class="drop-progress" hidden/>
    </div>
    `;
}
