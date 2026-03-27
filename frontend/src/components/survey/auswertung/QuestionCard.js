'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import SubquestionCard from './SubquestionCard';
import { meanWeighted, sdWeighted, entropy, normalize } from './utils/stats';

export default function QuestionCard({ q, qi, weights, expandedMap, setExpandedMap }) {
    const t = useTranslations('SurveyTool.analysis');
    // analyze question (same logic as before but local to component to keep modularity)
    const choices = q.choice || [];
    const subq = q.subquestions || [];
    const results = q.results || [];

    const parsedChoices = choices.map(c => { const n = parseFloat(c); return Number.isFinite(n) ? n : null; });
    const allNumeric = parsedChoices.length>0 && parsedChoices.every(c=>c!==null);
    const excludeValue = allNumeric && parsedChoices.includes(6) ? 6 : null;

    const rows = subq.map((label, idx) => {
        const counts = (results[idx] ? results[idx].slice() : []);
        while (counts.length < choices.length) counts.push(0);
        const total = counts.reduce((a,b)=>a+b,0);

        if (allNumeric) {
            const values = parsedChoices;
            const excludeIndex = excludeValue !== null ? values.indexOf(excludeValue) : -1;
            const countsIncluded = counts.filter((c,i)=> i!==excludeIndex);
            const valuesIncluded = values.filter((v,i)=> i!==excludeIndex);
            const N = countsIncluded.reduce((a,b)=>a+b,0);
            const mean = N>0 ? meanWeighted(valuesIncluded, countsIncluded) : null;
            const sd = N>0 ? sdWeighted(valuesIncluded, countsIncluded, mean) : null;
            const excludedCount = excludeIndex>=0 ? counts[excludeIndex] : 0;
            const excludedPercent = total>0 ? excludedCount/total : 0;
            return { label, counts, total, numeric:true, values, N, mean, sd, excludedCount, excludedPercent };
        } else {
            const tot = total;
            const topIndex = counts.reduce((bestI,c,i) => c > counts[bestI] ? i : bestI, 0);
            const topCount = counts[topIndex] || 0;
            const topPercent = tot>0 ? topCount/tot : 0;
            const ent = entropy(counts);
            return { label, counts, total:tot, numeric:false, topIndex, topLabel:choices[topIndex], topPercent, entropy:ent, choices };
        }
    });

    // compute ranks
    if (allNumeric) {
        const numericValues = parsedChoices.filter(v => v !== excludeValue);
        const minVal = Math.min(...numericValues);
        const maxVal = Math.max(...numericValues);
        const sdMax = (maxVal - minVal) || 1;
        const sumW = (weights.mean || 0) + (weights.sd || 0) || 1;
        const wMean = (weights.mean||0)/sumW;
        const wSd = (weights.sd||0)/sumW;

        rows.forEach(r => {
            if (r.N===0 || r.mean===null) { r.normalizedMean=null; r.normalizedSD=null; r.rank=null; return; }
            const normMean = normalize(r.mean, minVal, maxVal);
            const meanScore = 1 - normMean;
            const normSD = r.sd!==null ? Math.min(1, r.sd / sdMax) : 0;
            r.normalizedMean = normMean; r.normalizedSD = normSD;
            r.rank = +(wMean * meanScore + wSd * normSD).toFixed(6);
        });
    } else {
        const k = choices.length || 1;
        const maxEnt = Math.log(Math.max(2,k));
        const sumW = (weights.mean || 0) + (weights.sd || 0) || 1;
        const wMean = (weights.mean||0)/sumW;
        const wSd = (weights.sd||0)/sumW;

        rows.forEach(r => {
            const entNorm = maxEnt>0 ? r.entropy / maxEnt : 0;
            const success = r.topPercent || 0;
            r.entNorm = entNorm;
            r.rank = +(wMean * success + wSd * entNorm).toFixed(6);
        });
    }

    const valid = rows.filter(r => r.rank !== null && r.rank !== undefined);
    const best = valid.length ? valid.reduce((a,b)=> b.rank > a.rank ? b : a, valid[0]) : null;
    const worst = valid.length ? valid.reduce((a,b)=> b.rank < a.rank ? b : a, valid[0]) : null;
    const polar = valid.length ? valid.reduce((a,b) => {
        const aP = a.normalizedSD ?? a.entNorm ?? 0; const bP = b.normalizedSD ?? b.entNorm ?? 0; return bP > aP ? b : a;
    }, valid[0]) : null;

    // handlers for expand all / collapse all within this question
    const toggle = (label) => {
        const key = `${qi}::${label}`;
        setExpandedMap(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <article className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-xs text-gray-400">{t('question')} {qi+1}</div>
                    <h2 className="text-lg font-semibold">{q.question}</h2>
                    <div className="text-xs text-gray-500 mt-1">{allNumeric ? t('numericMode') : t('categoricalMode')} {excludeValue ? `• '${excludeValue}' ${t('excludedSuffix')}` : ''}</div>
                </div>

                <div className="text-right">
                    <div className="text-xs text-gray-500">{t('topSub')}</div>
                    <div className="font-semibold">{best?.label ?? '–'}</div>
                    <div className="text-xs text-gray-400 mt-1">{t('rank')}: {best?.rank ? best.rank.toFixed(3) : '–'}</div>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {rows.slice().sort((a,b)=> (b.rank||0)-(a.rank||0)).map((r,ri)=> (
                    <SubquestionCard key={ri} qIdx={qi} r={r} analysisAllNumeric={allNumeric} expanded={!!expandedMap[`${qi}::${r.label}`]} onToggle={()=>toggle(r.label)} />
                ))}
            </div>

            <div className="mt-3 flex gap-2 text-xs text-gray-600">
                {best && <div className="px-2 py-1 bg-green-50 rounded border">{t('best')}: {best.label}</div>}
                {worst && <div className="px-2 py-1 bg-red-50 rounded border">{t('worst')}: {worst.label}</div>}
                {polar && <div className="px-2 py-1 bg-yellow-50 rounded border">{t('polar')}: {polar.label}</div>}
            </div>
        </article>
    );
}