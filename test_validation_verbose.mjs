
const fetchImageToBase64 = async (url) => {
    try {
        console.log("Fetching: " + url);
        // Use corsproxy.io
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        console.log("Status: " + response.status);

        const contentType = response.headers.get("content-type");
        console.log("Content-Type: " + contentType);

        if (!response.ok) {
            console.log("Response not OK");
            return undefined;
        }

        if (!contentType || !contentType.startsWith("image/")) {
            console.warn("Fetched URL is not an image:", contentType);
            return undefined;
        }

        const blob = await response.blob();
        return "Blob size: " + blob.size;
    } catch (e) {
        console.warn("Failed to fetch logo image", e);
        return undefined;
    }
};

const test = async () => {
    // 1. Valid Image (Google Logo via Clearbit)
    console.log("\n--- TEST 1: Valid Image ---");
    const valid = await fetchImageToBase64("https://logo.clearbit.com/google.com");
    console.log("Result: " + valid);
};

test();
