import { useEffect, useState } from 'react';
import { listSchemas } from '../../api';


export default function useSchemas() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listSchemas()
            .then((items) => setFiles(items || []))
            .catch(() => setFiles([]))
            .finally(() => setLoading(false));
    }, []);
    return { files, loading };
}