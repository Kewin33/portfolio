export function meanWeighted(values, counts) {
    const total = counts.reduce((a,b)=>a+b,0);
    if (total === 0) return null;
    return values.reduce((s,v,i)=>s + v*counts[i], 0) / total;
}


export function sdWeighted(values, counts, mean) {
    const total = counts.reduce((a,b)=>a+b,0);
    if (total === 0) return null;
    const varSum = values.reduce((s,v,i)=> s + counts[i]*Math.pow(v-mean,2), 0);
    return Math.sqrt(varSum / total);
}


export function entropy(counts) {
    const total = counts.reduce((a,b)=>a+b,0);
    if (total === 0) return 0;
    return counts.reduce((e,c)=> {
        if (c<=0) return e;
        const p = c/total;
        return e - p * Math.log(p);
    }, 0);
}


export function normalize(x, min, max) { if (min===max) return 0; return (x-min)/(max-min); }
export function formatPercent(p){ return (p*100).toFixed(1) + '%'; }