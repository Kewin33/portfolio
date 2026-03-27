import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function VoiceHelpPopup({ commands }) {
    const t = useTranslations('SurveyTool.data');
    const [open, setOpen] = useState(false);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Toggle Button */}
            <button
                onClick={() => setOpen(!open)}
                className="px-3 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600"
            >
                {open ? t('close') : t('voiceCommands')}
            </button>

            {/* Popup */}
            {open && (
                <div className="mt-2 w-64 p-4 bg-white dark:bg-gray-800 border rounded shadow-lg text-sm text-gray-900 dark:text-gray-100">
                    <h3 className="font-semibold mb-2">{t('supportedVoiceCommands')}</h3>
                    <ul className="list-disc list-inside space-y-1">
                        {commands.map((cmd, i) => (
                            <li key={i}>
                                <span className="font-medium">{cmd.phrase}</span>: {cmd.description}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
