'use client';
import React from 'react';
import { useTranslations } from 'next-intl';


export default function Header({ filename, onReset, weights, setWeights }) {
    const t = useTranslations('SurveyTool.analysis');
    return (
        <header className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold">{t('headerTitle')} — {filename || t('noFile')}</h1>
                <p className="text-sm text-gray-500">{t('headerSubtitle')}</p>
            </div>


            <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-gray-200 rounded" onClick={onReset}>{t('otherFile')}</button>


                <div className="text-xs text-gray-600">{t('weights')}</div>
                <input type="number" step="0.05" min="0" max="1" value={weights.mean}
                       onChange={(e)=>setWeights(w=>({...w, mean: Math.min(1,Math.max(0,parseFloat(e.target.value)||0))}))}
                       className="w-16 border rounded p-1"/>
                <input type="number" step="0.05" min="0" max="1" value={weights.sd}
                       onChange={(e)=>setWeights(w=>({...w, sd: Math.min(1,Math.max(0,parseFloat(e.target.value)||0))}))}
                       className="w-16 border rounded p-1"/>
                <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={()=>{
                    const sum = (weights.mean||0)+(weights.sd||0) || 1;
                    setWeights({ mean: ((weights.mean||0)/sum), sd: ((weights.sd||0)/sum) });
                }}>{t('normalize')}</button>
            </div>
        </header>
    );
}