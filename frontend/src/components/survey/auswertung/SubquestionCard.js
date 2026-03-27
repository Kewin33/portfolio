'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import DistributionDetails from './DistributionDetails';

export default function SubquestionCard({ qIdx, r, analysisAllNumeric, expanded, onToggle }) {
    const t = useTranslations('SurveyTool.analysis');
    return (
        <div className="p-3 rounded-lg bg-gray-50 border">
            <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
                <div className="flex items-center gap-3">
                    <div className="font-medium">{r.label}</div>
                    <div className="text-xs text-gray-500">({r.total})</div>
                </div>

                <div className="flex items-center gap-4">
                    {r.numeric ? (
                        <div className="flex text-right mr-2">
                            <div className="px-3">
                                <div className="text-sm font-mono">{r.mean===null ? '–' : r.mean.toFixed(2)}</div>
                                <div className="text-xs text-gray-500">{t('mean')}</div>
                            </div>
                            <div className="px-3">
                                <div className="text-sm font-mono">{r.sd===null ? '–' : r.sd.toFixed(2)}</div>
                                <div className="text-xs text-gray-500">SD</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 mr-2">{t('top')}: <span className="font-semibold text-gray-700">{r.topLabel ?? '–'}</span></div>
                    )}

                    {analysisAllNumeric && <div className="text-xs text-gray-500 font-mono w-14 text-right">{r.rank===null ? '–' : r.rank.toFixed(3)}</div>}
                    <div className={`transform transition-transform ${expanded ? 'rotate-180' : 'rotate-0'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Rank bar */}
            {analysisAllNumeric && <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">{t('rank')}</div>
                <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded h-3 overflow-hidden">
                        <div style={{ width: `${Math.round((r.rank||0)*100)}%` }} className="h-3 bg-gradient-to-r from-green-400 to-blue-500 rounded" />
                    </div>
                    <div className="text-xs text-gray-700 font-mono w-14 text-right">{r.rank===null ? '–' : r.rank.toFixed(3)}</div>
                </div>
            </div>
            }
            {(expanded || !analysisAllNumeric) && (
                <div className="mt-3 border-t pt-3">
                    <DistributionDetails r={r} />
                </div>
            )}
        </div>
    );
}
