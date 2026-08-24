import { useEffect, useState } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { COLORS } from '../theme/tokens.js';

// Campo de búsqueda con estado y debounce internos: teclear no re-renderiza la
// página que lo contiene. Emite `onChange` solo cuando el valor queda estable
// (400ms), de modo que el componente padre recibe ya el término debounced.
export function SearchField({ placeholder = 'Buscar', debounceMs = 400, onChange, ...rest }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onChange(value), debounceMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs]);

  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      sx={{ flexGrow: 1 }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: COLORS.neutral }} />
          </InputAdornment>
        ),
      }}
      {...rest}
    />
  );
}

export default SearchField;