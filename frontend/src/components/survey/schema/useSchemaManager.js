import { useEffect, useState } from "react";
import { listSchemas, loadSchema, saveSchema } from "../api";

export function useSchemaManager() {
    const [availableSchemas, setAvailableSchemas] = useState([]);

    useEffect(() => {
        listSchemas()
            .then((files) => setAvailableSchemas(files))
            .catch(err => console.error(err));
    }, []);

    const loadSchemaByName = async (filename) => {
        return loadSchema(filename);
    };

    const saveSchemaByName = async (filename, data) => {
        return saveSchema({ filename, data });
    };

    return { availableSchemas, loadSchema: loadSchemaByName, saveSchema: saveSchemaByName };
}
