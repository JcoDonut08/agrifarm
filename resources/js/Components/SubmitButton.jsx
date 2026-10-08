export default function SubmitButton({ processing = false, children, className = '', ...props }) {
    return (
        <button
            type="submit"
            disabled={processing}
            className={`app-primary-button w-full disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
