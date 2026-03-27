'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { formatPercent } from './utils/stats';


export default function DistributionDetails({ r }) {
    const t = useTranslations('SurveyTool.analysis');
    const total = r.counts.reduce((a,b)=>a+b,0) || 0;
    return (
        <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
                <div className="text-gray-600">{t('total')}: <strong className="text-gray-800">{total}</strong></div>
                {r.topLabel && <div><span className="inline-block bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs border">{t('top')}: {r.topLabel}</span></div>}
            </div>


            <div className="mt-2 space-y-2">
                {(r.numeric ? r.values : r.choices).map((label, i) => {
                    const cnt = r.counts[i] || 0;
                    const pct = total ? cnt/total : 0;
                    return (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-36 text-sm text-gray-700">{label}</div>
                            <div className="flex-1 bg-gray-100 h-4 rounded-full overflow-hidden">
                                <div style={{ width: `${pct*100}%` }} className={`h-4 rounded-full ${r.numeric ? 'bg-gradient-to-r from-green-400 to-blue-500' : 'bg-gradient-to-r from-purple-400 to-pink-500'}`}></div>
                            </div>
                            <div className="w-12 text-right text-sm text-gray-600">{cnt}</div>
                            <div className="w-14 text-right text-sm text-gray-600">{formatPercent(pct)}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}