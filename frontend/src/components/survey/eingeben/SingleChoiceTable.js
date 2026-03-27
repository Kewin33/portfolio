export default function SingleChoiceTable({ questionData, onChange }) {
    const handleChange = (index, value) => {
        const newResults = [...questionData.results];
        newResults[index] = value;
        onChange(newResults);
    };

    return (
        <table className="w-full border-collapse text-sm my-4">
            <thead>
            <tr>
                {questionData.choice.map((c, i) => (
                    <th key={i} className="border p-2 bg-blue-100">{c}</th>
                ))}
            </tr>
            </thead>
            <tbody>
            <tr>
                {questionData.choice.map((_, i) => (
                    <td key={i} className="border p-2 text-center">
                        <input
                            type="number"
                            className="w-full text-center border rounded p-1"
                            value={questionData.results[i]}
                            onChange={(e) => handleChange(i, Number(e.target.value))}
                        />
                    </td>
                ))}
            </tr>
            </tbody>
        </table>
    );
}