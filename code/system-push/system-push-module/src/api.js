import config from "../../config.js";

/**
 * Get the info for the configured Netlify site
 * @param {API} api Directus API
 * @returns {Object} Site info
 */
async function getSite(api) {
    const { data } = await api.get(`/${config.extension}/site`);
    if (data && data.error) throw new Error(data.error);
    return data && data.site ? data.site : undefined;
}

async function postPushNotification(api, role, content) {
    const resp = await api.post('/pushnotification/send', {
        'role': role,
        'content': content
    });
    return resp;
}

export {
    getSite, postPushNotification
};