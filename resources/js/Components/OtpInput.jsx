import { useRef } from 'react';

export default function OtpInput({ value, onChange, error, disabled = false }) {
    const inputs = useRef([]);
    const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '');
    const describedBy = error ? 'code-error' : 'code-hint';

    function setDigit(index, nextValue) {
        const numericValue = nextValue.replace(/\D/g, '');

        if (numericValue.length > 1) {
            const completeCode = numericValue.slice(0, 6);
            onChange(completeCode);
            inputs.current[Math.min(completeCode.length, 6) - 1]?.focus();

            return;
        }

        const digit = numericValue.slice(-1);
        const nextDigits = [...digits];
        nextDigits[index] = digit;
        onChange(nextDigits.join('').slice(0, 6));

        if (digit && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    }

    function handleKeyDown(event, index) {
        if (event.key === 'Backspace') {
            event.preventDefault();
            const nextDigits = [...digits];

            if (nextDigits[index]) {
                nextDigits[index] = '';
            } else if (index > 0) {
                nextDigits[index - 1] = '';
                inputs.current[index - 1]?.focus();
            }

            onChange(nextDigits.join(''));
        }

        if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
        if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus();
    }

    function handlePaste(event) {
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;

        event.preventDefault();
        onChange(pasted);
        inputs.current[Math.min(pasted.length, 6) - 1]?.focus();
    }

    return (
        <fieldset>
            <legend className="block w-full text-center text-sm font-semibold text-stone-800 dark:text-stone-200">6-digit code</legend>
            <div className="mt-3 grid grid-cols-6 gap-2 sm:gap-3" onPaste={handlePaste}>
                {digits.map((digit, index) => (
                    <input
                        key={index}
                        ref={(element) => { inputs.current[index] = element; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        value={digit}
                        disabled={disabled}
                        onChange={(event) => setDigit(index, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        aria-label={`Code digit ${index + 1} of 6`}
                        aria-describedby={describedBy}
                        aria-invalid={Boolean(error)}
                        className={`aspect-square min-w-0 rounded-xl border bg-cream-50 text-center text-xl font-bold text-forest-950 shadow-sm outline-none transition focus:bg-white focus:ring-4 focus:ring-harvest-400/35 dark:bg-night-800 dark:text-white dark:focus:bg-night-700 sm:text-2xl ${
                            error ? 'border-red-500 focus:border-red-600' : 'border-forest-200 focus:border-forest-600 dark:border-white/15'
                        }`}
                    />
                ))}
            </div>
            {!error && <p id="code-hint" className="mt-2 text-center text-xs text-stone-500 dark:text-stone-400">Type or paste the complete code.</p>}
            {error && <p id="code-error" className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
        </fieldset>
    );
}
