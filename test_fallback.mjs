
const fetchImageToBase64 = async (url) => {
    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (!response.ok) return undefined;

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.startsWith("image/")) {
            return undefined;
        }

        const blob = await response.blob();
        return blob.size;
    } catch (e) {
        return undefined;
    }
};

const fetchLogoFromUrl = async (websiteUrl) => {
    try {
        const domain = new URL(websiteUrl).hostname;

        const sources = [
            `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            `https://icons.duckduckgo.com/ip3/${domain}.ico`,
            `https://logo.clearbit.com/${domain}`,
        ];

        for (const logoUrl of sources) {
            console.log(`  Trying: ${logoUrl}`);
            const result = await fetchImageToBase64(logoUrl);
            if (result) {
                console.log(`  ✓ SUCCESS (${result} bytes)`);
                return result;
            }
            console.log(`  ✗ Failed`);
        }

        return undefined;
    } catch (e) {
        return undefined;
    }
};

const test = async () => {
    const domains = [
        "https://google.com",
        "https://stripe.com",
        "https://someobscuresite12345.com",
        "https://github.com",
    ];

    for (const domain of domains) {
        console.log(`\nTesting: ${domain}`);
        const result = await fetchLogoFromUrl(domain);
        console.log(`Final Result: ${result ? 'Found' : 'Not Found'}`);
    }
};

test();
