export interface GoogleFile {
    id: string;
    name: string;
    parents: string[];
    thumbnailLink?: string;
    // hasThumbnail: string;
    // mimeType: string;
    // createdTime: string;
    // modifiedTime: string;
    appProperties: {
        origin: string;
        src: string;
    };
}

export interface GoogleFileRes {
    files: GoogleFile[];
    nextPageToken?: string;
}

export interface GoogleSignInPayload {
    credential: string;
    select_by: string;
}

declare global {
    interface Window {
        google: any;
    }
}

export interface ImgMeta {
    name?: string;
    mimeType?: string;
    parents?: [string];
    appProperties?: {
        origin?: string;
        src?: string;
    };
}

export interface CreateResourceResponse {
    kind: string;
    id: string;
    name: string;
    mimeType: string;
}

export interface DropItem {
    name: string;
    mimeType: string;
    url?: string;
    bytes: Uint8Array;
    imgRef: string;
}

export interface DropItems {
    [id: number]: DropItem;
}
