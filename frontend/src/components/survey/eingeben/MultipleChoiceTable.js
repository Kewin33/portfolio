import {useState, useRef, useEffect} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import VoiceHelpPopup from './VoiceHelpPopup';

export default function MultipleChoiceTable({ questionData, onChange, onVoiceEnd, autoStartVoice }) {
    const locale = useLocale();
    const t = useTranslations('SurveyTool.data');
    const voiceCommands = [
        { phrase: t('voiceCmdChoicePhrase'), description: t('voiceCmdChoiceDesc') },
        { phrase: t('voiceCmdCommentPhrase'), description: t('voiceCmdCommentDesc') },
        { phrase: t('voiceCmdSkipPhrase'), description: t('voiceCmdSkipDesc') }
    ];
    const [activeRow, setActiveRow] = useState(null);
    const [debug, setDebug] = useState({ listening: false, heard: '', matchedChoices: [], error: null });
    const recognitionRef = useRef(null);
    const rowIndexRef = useRef(0);

    useEffect(() => {
        if (autoStartVoice) {
            startVoiceInput();
        }
    }, [autoStartVoice]);

    const handleInputChange = (subIndex, choiceIndex, value) => {
        const newResults = [...questionData.results];
        const choiceLabel = questionData.choice[choiceIndex]?.toLowerCase();
        if (choiceLabel === 'kommentar' || choiceLabel === 'comment') {
            if (!Array.isArray(newResults[subIndex][choiceIndex])) newResults[subIndex][choiceIndex] = [];
            newResults[subIndex][choiceIndex] = value.split('\n');
        } else {
            newResults[subIndex][choiceIndex] = Number(value);
        }
        onChange(newResults);
    };

    const handleManualSkip = () => {
        // manuelles Überspringen der aktuellen Zeile
        if (rowIndexRef.current < questionData.subquestions.length - 1) {
            rowIndexRef.current++;
            setActiveRow(rowIndexRef.current);
            setDebug(prev => ({
                ...prev,
                matchedChoices: [...prev.matchedChoices, { row: rowIndexRef.current - 1, choice: 'manual skip' }]
            }));
        } else {
            // Wenn am Ende -> Stop recognition
            if (recognitionRef.current) recognitionRef.current.stop();
            if(onVoiceEnd) onVoiceEnd();
        }
    };

    const startVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert(t('browserNoVoice'));
            return;
        }

        if (recognitionRef.current) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = locale === 'en' ? 'en-US' : 'de-DE';
        recognition.interimResults = false;
        recognition.continuous = true;
        recognitionRef.current = recognition;

        rowIndexRef.current = 0;
        setActiveRow(0);
        setDebug({ listening: true, heard: '', matchedChoices: [], error: null });

        recognition.onresult = (event) => {
            const transcriptRaw = event.results[event.results.length - 1][0].transcript.trim();
            setDebug(prev => ({ ...prev, heard: transcriptRaw }));

            const newResults = [...questionData.results];
            const matchedChoices = [];
            let currentRow = rowIndexRef.current;
            const normalize = (str) => str.toLowerCase().replace(/\s+/g, '');
            const lowerTranscript = normalize(transcriptRaw);

            // === Skip ===
            const skipMatch = lowerTranscript.match(/skip(?:\s+(\d+))?/);
            if (skipMatch) {
                const skipCount = skipMatch[1] ? parseInt(skipMatch[1], 10) : 1;
                currentRow += skipCount;
                matchedChoices.push({ row: currentRow - skipCount, choice: 'skip' });
            }

            // === Kommentar ===
            const commentKeyword = t('commentKeyword').toLowerCase();
            const endKeyword = t('voiceKeywordEnd').toLowerCase();
            const commentIndex = questionData.choice.findIndex(c => {
                const value = c.toLowerCase();
                return value === 'kommentar' || value === 'comment' || value === commentKeyword;
            });
            if (commentIndex !== -1) {
                const start = lowerTranscript.indexOf(commentKeyword);
                if (start !== -1) {
                    let end = lowerTranscript.indexOf(endKeyword, start);
                    if (end === -1) end = transcriptRaw.length;
                    const commentText = transcriptRaw.substring(start + commentKeyword.length, end).trim();
                    if (commentText) {
                        const existing = newResults[currentRow][commentIndex];
                        if (Array.isArray(existing) && existing.length > 0) {
                            newResults[currentRow][commentIndex] = [...existing, commentText];
                        } else {
                            newResults[currentRow][commentIndex] = [commentText];
                        }
                        matchedChoices.push({ row: currentRow, choice: 'Kommentar' });
                    }
                }
            }

            // === Normale Choices ===
            const matches = [];
            questionData.choice
                .filter(c => {
                    const value = c.toLowerCase();
                    return value !== 'kommentar' && value !== 'comment' && value !== commentKeyword;
                })
                .forEach(choice => {
                    const normChoice = normalize(choice);
                    let startIndex = 0;
                    while (true) {
                        const index = lowerTranscript.indexOf(normChoice, startIndex);
                        if (index === -1) break;
                        matches.push({ choice, index });
                        startIndex = index + normChoice.length;
                    }
                });

            matches.sort((a, b) => a.index - b.index);
            matches.forEach(({ choice }) => {
                if (currentRow >= questionData.subquestions.length) return;
                const choiceIndex = questionData.choice.findIndex(c => c === choice);
                newResults[currentRow][choiceIndex] = (newResults[currentRow][choiceIndex] || 0) + 1;
                matchedChoices.push({ row: currentRow, choice });
                currentRow++;
            });

            rowIndexRef.current = currentRow;
            onChange(newResults);
            setActiveRow(currentRow < questionData.subquestions.length ? currentRow : null);
            setDebug(prev => ({ ...prev, matchedChoices }));

            if (currentRow >= questionData.subquestions.length) {
                recognition.stop();
                recognitionRef.current = null;
                setDebug(prev => ({ ...prev, listening: false }));
                setActiveRow(null)
                if (onVoiceEnd) onVoiceEnd();
            }
        };

        recognition.onerror = (err) => {
            console.error('SpeechRecognition Fehler', err);
            setDebug(prev => ({ ...prev, error: err.message, listening: false }));
            recognition.stop();
            recognitionRef.current = null;
            setActiveRow(null);
        };

        recognition.onend = () => {
            recognitionRef.current = null;
            setDebug(prev => ({ ...prev, listening: false }));
        };

        recognition.start();
    };

    return (
        <div>
            {/* Sprachsteuerungsbuttons */}
            <div className="flex gap-2 mb-2">
                <button
                    onClick={() => {
                        if (debug.listening && recognitionRef.current) {
                            recognitionRef.current.stop();
                        } else {
                            startVoiceInput();
                        }
                    }}
                    className={`px-3 py-1 rounded text-white ${
                        debug.error
                            ? 'bg-red-500 hover:bg-red-600'
                            : debug.listening
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-green-500 hover:bg-green-600'
                    }`}
                >
                    {debug.error
                        ? t('voiceError')
                        : debug.listening
                            ? t('voiceRunningStop')
                            : t('voiceStart')}
                </button>

                {/* NEUER SKIP-BUTTON */}
                {debug.listening && (
                    <button
                        onClick={handleManualSkip}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                    >
                        {t('skipManual')}
                    </button>
                )}
            </div>

            {/* Debug Panel */}
            <div className="mb-4 p-2 border rounded bg-gray-50 dark:bg-gray-800">
                <h3 className="font-semibold mb-1">{t('debugPanel')}:</h3>
                <p>{t('listening')}: {debug.listening ? '✅' : '❌'}</p>
                <p>{t('activeRow')}: {activeRow !== null ? activeRow + 1 : '–'}</p>
                <p>{t('heard')}: {debug.heard || '–'}</p>
                <p>{t('matchedChoices')}:</p>
                <ul className="pl-4">
                    {debug.matchedChoices.map((m, i) => (
                        <li key={i}>{t('rowChoice', { row: m.row + 1, choice: m.choice })}</li>
                    ))}
                </ul>
                <p>{t('error')}: {debug.error || '–'}</p>
            </div>

            {/* Tabelle */}
            <table className="w-full border-collapse text-sm my-4">
                <thead>
                <tr>
                    <th className="border p-2 bg-blue-100 text-left">{t('subquestionChoice')}</th>
                    {questionData.choice.map((c, i) => (
                        <th key={i} className="border p-2 bg-blue-100">{c}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {questionData.subquestions.map((sub, i) => (
                    <tr
                        key={i}
                        className={`hover:bg-gray-50 dark:hover:bg-[#1e293b]/40 transition ${
                            activeRow === i ? 'bg-yellow-200 dark:bg-yellow-500/40' : ''
                        }`}
                    >
                        <td className="border p-2 font-medium">{sub}</td>
                        {questionData.choice.map((c, j) => {
                            const value = c.toLowerCase();
                            const isComment = value === 'kommentar' || value === 'comment' || value === t('commentKeyword').toLowerCase();
                            const val = isComment
                                ? (Array.isArray(questionData.results[i][j]) ? questionData.results[i][j].join('\n') : '')
                                : questionData.results[i][j];
                            return (
                                <td key={j} className="border p-2 text-center">
                                    {isComment ? (
                                        <textarea
                                            className="w-full p-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            value={val}
                                            onChange={(e) => handleInputChange(i, j, e.target.value)}
                                            rows={3}
                                        />
                                    ) : (
                                        <input
                                            type="number"
                                            className="w-full text-center border rounded p-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            value={val}
                                            onChange={(e) => handleInputChange(i, j, e.target.value)}
                                        />
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
                </tbody>
            </table>
            <VoiceHelpPopup commands={voiceCommands} />
        </div>
    );
}
