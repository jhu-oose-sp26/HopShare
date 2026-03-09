import { useEffect, useRef, useState } from 'react';

const inputBase =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function LocationAutocomplete({ id, value, onChange, onSelect, placeholder, required, coords }) {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef(null);

    // Keep the visible query aligned with parent-driven values.
    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    // Debounced fetch while the user is actively interacting with the field.
    useEffect(() => {
        if (!isFocused || query.trim().length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ q: query });
                if (coords) {
                    params.set('lat', coords.lat);
                    params.set('lng', coords.lng);
                }
                const res = await fetch(`/api/places/autocomplete?${params}`);
                if (!res.ok) {
                    setSuggestions([]);
                    setIsOpen(false);
                    return;
                }
                const data = await res.json();

                const nextSuggestions = data.suggestions || [];
                setSuggestions(nextSuggestions);
                setIsOpen(isFocused && nextSuggestions.length > 0);

            } catch {
                setSuggestions([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, isFocused, coords]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleSelect(suggestion) {
        const full = suggestion.subtext
            ? `${suggestion.label}, ${suggestion.subtext}`
            : suggestion.label;
        setQuery(full);
        onChange(full);
        onSelect?.({ label: full, latitude: suggestion.latitude, longitude: suggestion.longitude });
        setSuggestions([]);
        setIsOpen(false);
        setIsFocused(false);
    }

    function handleChange(e) {
        const val = e.target.value;
        setQuery(val);
        onChange(val);
    }

    function handleFocus() {
        setIsFocused(true);
        if (suggestions.length > 0 && query.trim().length >= 2) {
            setIsOpen(true);
        }
    }

    function handleBlur() {
        setIsFocused(false);
        setIsOpen(false);
    }

    return (
        <div ref={containerRef} className='relative'>
            <input
                id={id}
                type='text'
                className={inputBase}
                placeholder={placeholder}
                value={query}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required={required}
                autoComplete='off'
            />
            {isFocused && isOpen && suggestions.length > 0 && (
                <ul className='absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-md'>
                    {suggestions.map((s, i) => (
                        <li
                            key={i}
                            className='cursor-pointer px-3 py-2 hover:bg-accent hover:text-accent-foreground'
                            onMouseDown={() => handleSelect(s)}
                        >
                            <div className='text-sm font-medium'>{s.label}</div>
                            {s.subtext && (
                                <div className='text-xs text-muted-foreground'>{s.subtext}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default LocationAutocomplete;
