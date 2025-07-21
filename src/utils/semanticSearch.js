import cosineSimilarity from 'cosine-similarity';
let products = [];

// Synonym and typo map
const SYNONYMS = {
    mobile: ['phone', 'cell', 'cellphone', 'smartphone'],
    laptop: ['notebook', 'macbook', 'chromebook'],
    shoe: ['shoes', 'sneaker', 'sneakers', 'footwear'],
    tv: ['television', 'tvee', 'teevee'],
    headphone: ['headphones', 'earphone', 'earphones', 'earbud', 'earbuds'],
    diaper: ['nappy'],
    // Add more as needed
};
const TYPOS = {
    iphnoe: 'iphone',
    samsng: 'samsung',
    laptap: 'laptop',
    moblie: 'mobile',
    shooz: 'shoes',
    snkar: 'sneaker',
    // Add more as needed
};

export function preprocessQuery(query) {
    let q = query.toLowerCase().trim();
    // Typo correction
    Object.keys(TYPOS).forEach(typo => {
        if (q.includes(typo)) q = q.replaceAll(typo, TYPOS[typo]);
    });
    // Synonym expansion
    Object.entries(SYNONYMS).forEach(([main, syns]) => {
        syns.forEach(syn => {
            if (q.includes(syn)) q += ' ' + main;
        });
    });
    // Remove extra spaces
    q = q.replace(/\s+/g, ' ');
    return q;
}

export async function loadProductEmbeddings() {
    try {
        const res = await fetch('/product_embeddings.json');
        products = await res.json();
    } catch (e) {
        try {
            products = (await
                import ('../product_embeddings.json')).default;
        } catch (err) {
            products = [];
        }
    }
}

export async function getQueryEmbedding(query) {
    try {
        const res = await fetch('http://localhost:5005/embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: query }),
        });
        if (!res.ok) throw new Error('Embedding API error');
        const data = await res.json();
        return data.embedding;
    } catch (err) {
        return null;
    }
}

function keywordSearch(query, topN = 10) {
    const q = query.toLowerCase();
    return products
        .filter(p =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q))
        )
        .slice(0, topN);
}

export function getClosestMatch(query) {
    // Find the closest product/category name for 'did you mean'
    const q = query.toLowerCase();
    let best = null;
    let bestScore = 0;
    products.forEach(p => {
        [p.name, p.category].forEach(field => {
            if (!field) return;
            const f = field.toLowerCase();
            let score = 0;
            if (f === q) score = 1;
            else if (f.includes(q) || q.includes(f)) score = 0.8;
            else {
                // Simple Levenshtein distance
                let dist = levenshtein(f, q);
                score = 1 - dist / Math.max(f.length, q.length);
            }
            if (score > bestScore) {
                bestScore = score;
                best = field;
            }
        });
    });
    return bestScore > 0.6 ? best : null;
}

function levenshtein(a, b) {
    const dp = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[a.length][b.length];
}

export async function semanticSearch(query, topN = 10) {
    if (!products.length) await loadProductEmbeddings();
    const preQ = preprocessQuery(query);
    const queryEmbedding = await getQueryEmbedding(preQ);
    if (!queryEmbedding) {
        return keywordSearch(preQ, topN);
    }
    return products
        .map(p => ({
            ...p,
            score: cosineSimilarity(queryEmbedding, p.embedding)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
}