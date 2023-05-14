import type { GoogleSignInPayload } from "../types";
import { initMenuEvents } from "./events";

export function isLoggedin() {
    const secret = window.localStorage.getItem("secret");
    return Boolean(secret);
}

export function toggleMenu() {
    const menu = document.querySelector(".menu") as HTMLDivElement;
    menu.classList.toggle("menu-visible");
    initMenuEvents();
}

export function toggleSignButton() {
    const signin = document.querySelector(
        ".signin-button"
    ) as HTMLButtonElement;
    signin.hidden = !signin.hidden;
}

export function isUserOnline(status: Boolean) {
    if (status) {
        toggleMenu();
        toggleSignButton();
        return;
    }
    loadGSIScript();
}

export function togglePreview(toggle: true | false) {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    preview.hidden = toggle;
}

export const loadGSIScript = () => {
    const src = "https://accounts.google.com/gsi/client";
    const header = document.querySelector(".header") as HTMLDivElement;
    const gsiIfExists = header.querySelector(`script[src='${src}']`);
    if (gsiIfExists) header.removeChild(gsiIfExists);
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_CLIENT_ID,
            nonce: import.meta.env.VITE_NONCE_WEB,
            auto_select: false,
            callback: handleGoogleSignIn,
        });
        // window.google.accounts.id.prompt();
        window.google.accounts.id.renderButton(
            document.querySelector(".signin-button"),
            {
                type: "icon",
                shape: "circle",
            }
        );
    };
    script.onerror = (e) => console.log(e);

    header.append(script);
};

export async function clearFiles() {
    window.localStorage.clear();
    const krabsCache = await caches.open("krabs");
    const keys = await krabsCache.keys();
    keys.forEach((key) => krabsCache.delete(key));
}
export async function signUserOut(e?: Event) {
    e?.stopPropagation();
    const api = import.meta.env.VITE_API;
    const secret = window.localStorage.getItem("secret");
    const res = await fetch(`${api}/logout/WEB`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (res.status !== 200) {
        if (res.status !== 401) {
            console.warn(res.status, await res.text());
            return;
        }
        console.warn(res.status, await res.text());
    }
    await clearFiles();
    history.pushState({ dir: "root" }, "", "/");
    window.location.reload();
}

export const handleGoogleSignIn = async (googleRes: GoogleSignInPayload) => {
    const creds = googleRes?.credential;
    const api = import.meta.env.VITE_API;
    const res = await fetch(`${api}/login`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ id_token: creds, app: "WEB" }),
    });
    if (res.status !== 200) {
        console.warn(res.status, await res.text());
        return;
    }
    const { token, root } = await res.json();
    localStorage.setItem("secret", token);
    localStorage.setItem("root", root);
    await getToken();
    window.location.reload();
};

export const getToken = async () => {
    const secret = window.localStorage.getItem("secret");
    const api = import.meta.env.VITE_API;
    const res = await fetch(`${api}/auth`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (res.status !== 200) {
        if (res.status === 401) {
            console.log("session timeout. Logging off");
            signUserOut();
            return;
        }
        console.warn(res.status, await res.text());
        return;
    }
    const { token } = await res.json();
    localStorage.setItem("token", token);
    return true;
};
