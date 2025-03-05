import { useContext } from "react";
import { SearchContext } from "./SearchContext";

// Exportujemo useSearch iz posebnog fajla
const useSearch = () => useContext(SearchContext);

export default useSearch;